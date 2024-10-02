import * as vscode from "vscode";
import { exec } from "child_process";
import { promisify, TextEncoder } from "util";
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";

const execAsync = promisify(exec);

// Maximum allowed size for diffs (e.g., 10,000 characters)
const MAX_DIFF_SIZE = 10000;

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "extension.generatePrSummary",
    async () => {
      try {
        // Get OpenAI API Key from configuration
        const config = vscode.workspace.getConfiguration("prSummaryGenerator");
        const apiKey = config.get<string>("apiKey", "").trim();
        if (!apiKey) {
          vscode.window.showErrorMessage(
            "Please set your OpenAI API Key in the extension settings."
          );
          return;
        }

        // Prompt for Additional Prompt
        const additionalPrompt =
          (await vscode.window.showInputBox({
            prompt: "Additional Prompt (optional)",
            ignoreFocusOut: true,
          })) || "";

        // Prompt for JIRA Ticket
        const jiraTicket =
          (await vscode.window.showInputBox({
            prompt: "JIRA Ticket (optional)",
            ignoreFocusOut: true,
          })) || "";

        // Prompt for Include Diffs
        const includeDiffsOption = await vscode.window.showQuickPick(
          ["Yes", "No"],
          {
            placeHolder: "Include Diffs?",
            ignoreFocusOut: true,
          }
        );
        const includeDiffs = includeDiffsOption === "Yes";

        // Prompt for Target Branch
        const targetBranch = await vscode.window.showInputBox({
          prompt: "Enter the target branch you are merging into:",
          value: "origin/dev",
          ignoreFocusOut: true,
        });
        if (!targetBranch) {
          vscode.window.showErrorMessage("Target branch is required.");
          return;
        }

        // Get current branch name
        const branchName = await getBranchName();

        // Get commit messages with diffs
        const commitMessagesWithDiff = await getCommitMessagesWithDiff(
          branchName,
          targetBranch,
          includeDiffs
        );

        // Check if commit messages are empty
        if (!commitMessagesWithDiff) {
          vscode.window.showWarningMessage(
            `No new commits found between ${targetBranch} and the current branch.`
          );
          return;
        }

        // Generate PR summary using OpenAI API
        const { title, description } = await generatePrSummary(
          apiKey,
          additionalPrompt,
          jiraTicket,
          branchName,
          commitMessagesWithDiff
        );

        // Display the PR summary to the user
        const document = await vscode.workspace.openTextDocument({
          content: `# ${title}\n\n${description}`,
          language: "markdown",
        });
        await vscode.window.showTextDocument(document);

        // Optionally save the PR summary to a file
        const saveOption = await vscode.window.showQuickPick(["Yes", "No"], {
          placeHolder: "Save PR summary to a file?",
          ignoreFocusOut: true,
        });
        if (saveOption === "Yes") {
          const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file("PR_summary.md"),
            filters: { "Markdown files": ["md"] },
          });
          if (uri) {
            const encoder = new TextEncoder();
            const uint8array = encoder.encode(`# ${title}\n\n${description}`);
            await vscode.workspace.fs.writeFile(uri, uint8array);
            vscode.window.showInformationMessage(
              "PR summary saved successfully."
            );
          }
        }
      } catch (error: any) {
        vscode.window.showErrorMessage(
          `Failed to generate PR summary: ${error.message}`
        );
      }
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {
  // Cleanup if necessary
}

/**
 * Retrieves the current branch name using git.
 * Checks if the workspace is a git repository.
 */
async function getBranchName(): Promise<string> {
  try {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      throw new Error("No workspace folder is open.");
    }
    const workspacePath = workspaceFolders[0].uri.fsPath;
    await execAsync("git rev-parse --is-inside-work-tree", {
      cwd: workspacePath,
    });
    const { stdout } = await execAsync("git rev-parse --abbrev-ref HEAD", {
      cwd: workspacePath,
    });
    return stdout.trim();
  } catch (error) {
    throw new Error(
      "Error obtaining branch name. Ensure you are inside a git repository."
    );
  }
}

/**
 * Retrieves commit messages with diffs from git.
 * Handles cases where no commits are found.
 * Optionally truncates diffs if they exceed MAX_DIFF_SIZE.
 */
async function getCommitMessagesWithDiff(
  branchName: string,
  targetBranch: string,
  includeDiffs: boolean
): Promise<string> {
  try {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      throw new Error("No workspace folder is open.");
    }
    const workspacePath = workspaceFolders[0].uri.fsPath;

    // Check if target branch exists
    try {
      await execAsync(
        `git show-ref --verify --quiet refs/heads/${targetBranch}`,
        { cwd: workspacePath }
      );
    } catch {
      // If not a local branch, check remote branches
      const { stdout } = await execAsync(
        `git ls-remote --heads origin ${targetBranch}`,
        { cwd: workspacePath }
      );
      if (!stdout.trim()) {
        throw new Error(`Target branch '${targetBranch}' does not exist.`);
      }
    }

    let gitLogCommand = `git log --pretty=format:%s%n%n%b ${targetBranch}..${branchName}`;
    if (includeDiffs) {
      gitLogCommand += " -p";
    }
    const { stdout } = await execAsync(gitLogCommand, { cwd: workspacePath });

    if (!stdout.trim()) {
      // No new commits found
      return "";
    }

    let output = stdout.trim();

    // Truncate diffs if too large
    if (includeDiffs && output.length > MAX_DIFF_SIZE) {
      output = output.substring(0, MAX_DIFF_SIZE);
      vscode.window.showWarningMessage(
        "Diff is too large and has been truncated to fit the size limit."
      );
    }

    return output;
  } catch (error: any) {
    throw new Error(`Error obtaining commit messages: ${error.message}`);
  }
}

/**
 * Calls the OpenAI API to generate the PR summary based on provided information.
 * Handles OpenAI API errors gracefully.
 */
async function generatePrSummary(
  apiKey: string,
  additionalPrompt: string,
  jiraTicket: string,
  branchName: string,
  commitMessagesWithDiff: string
): Promise<OpenAIResponse> {
  // Set the OpenAI API key
  const configuration = new Configuration({
    apiKey: apiKey,
  });
  const openai = new OpenAIApi(configuration);

  const messages: ChatCompletionRequestMessage[] = [
    {
      role: "user",
      content: `Generate a PR title and description (format the description in markdown) based on the following branch name and commit messages with diffs. Include JIRA ticket information if provided. **Be concise.**${
        additionalPrompt ? " " + additionalPrompt : ""
      }`,
    },
    { role: "user", content: `Branch Name: ${branchName}` },
    {
      role: "user",
      content: `Commit Messages with Diffs: ${commitMessagesWithDiff}`,
    },
  ];

  if (jiraTicket) {
    messages.push({ role: "user", content: `JIRA Ticket: ${jiraTicket}` });
  }

  const model = "gpt-3.5-turbo"; // Updated to a valid model name

  try {
    vscode.window.showInformationMessage(
      "Generating PR summary using OpenAI..."
    );
    const response = await openai.createChatCompletion({
      model,
      messages,
    });

    // Access the assistant's reply
    const assistantMessage = response.data.choices[0].message?.content ?? "";

    // Separate title and description from the assistant's response
    const [titleLine, ...descriptionLines] = assistantMessage
      .trim()
      .split("\n");
    const title = titleLine.replace(/^#\s*/, "").trim();
    const description = descriptionLines.join("\n").trim();

    return { title, description };
  } catch (error: any) {
    let errorMessage = "OpenAI API request error.";
    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        errorMessage =
          "Authentication failed. Please check your OpenAI API key.";
      } else if (status === 429) {
        errorMessage = "Rate limit exceeded. Please try again later.";
      } else {
        errorMessage = `OpenAI API error: ${error.response.data.error.message}`;
      }
    } else {
      errorMessage = `An error occurred: ${error.message}`;
    }
    throw new Error(errorMessage);
  }
}

interface OpenAIResponse {
  title: string;
  description: string;
}
