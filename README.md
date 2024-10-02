# PR Summary Generator

PR Summary Generator is a Visual Studio Code extension that helps you generate concise and informative pull request summaries using OpenAI's API. It analyzes your commits and diffs to create a markdown-formatted summary, streamlining your code review process.

## Features

- **Automated PR Summaries**: Generate pull request titles and descriptions based on your commit history and code diffs.
- **OpenAI Integration**: Leverage OpenAI's API to create human-like summaries.
- **Customizable Prompts**: Add additional instructions or JIRA ticket information to tailor the generated summaries.
- **Diff Inclusion Options**: Choose whether to include code diffs in the analysis for more detailed summaries.
- **Save Summaries**: Option to save the generated PR summary to a markdown file directly from VS Code.

## Requirements

- **Visual Studio Code** version 1.60.0 or higher.
- An **OpenAI API Key**.

## Installation

1. **Install the Extension**:

   - Navigate to the [VS Code Marketplace](#) (replace `#` with the actual link) and install the **PR Summary Generator** extension.
   - Alternatively, search for "PR Summary Generator" in the VS Code Extensions pane and install it.

2. **Configure the API Key**:
   - Go to **Settings**: `File` > `Preferences` > `Settings` (or `Code` > `Preferences` > `Settings` on macOS).
   - Search for `PR Summary Generator`.
   - Enter your OpenAI API Key in the `prSummaryGenerator.apiKey` field.

## Usage

1. **Open Your Project**: Ensure your workspace is a Git repository.

2. **Run the Command**:

   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS) to open the command palette.
   - Type `Generate PR Summary` and select the **Generate PR Summary** command.

3. **Follow the Prompts**:

   - **Additional Prompt (optional)**: Enter any extra instructions or leave it blank.
   - **JIRA Ticket (optional)**: Enter a JIRA ticket ID if applicable.
   - **Include Diffs?**: Choose **Yes** or **No** to include code diffs in the analysis.
   - **Target Branch**: Specify the branch you're merging into (default is `origin/dev`).

4. **View the Generated Summary**:

   - The extension will generate a PR summary and display it in a new markdown editor.
   - Review and edit the summary as needed.

5. **Save the Summary (optional)**:
   - When prompted, choose whether to save the summary to a file.
   - If **Yes**, select the destination and filename.

## Extension Settings

The extension adds the following settings to VS Code:

- **`prSummaryGenerator.apiKey`**:

  - **Type**: `string`
  - **Default**: `""` (empty string)
  - **Description**: Your OpenAI API Key. This is required for the extension to function.

- **`prSummaryGenerator.defaultTargetBranch`**:
  - **Type**: `string`
  - **Default**: `"origin/dev"`
  - **Description**: Default target branch for generating diffs.

## Known Issues

- **Large Diffs**: If the diffs exceed the maximum allowed size, they will be truncated, which might affect the summary's accuracy.
- **API Errors**: Authentication or rate limit errors from OpenAI will be displayed as notifications.
- **Git Repository Detection**: The extension requires an active Git repository. Ensure your workspace is correctly initialized with Git.

## Release Notes

### 0.1.0

- Initial release of **PR Summary Generator**.
  - Generate PR summaries based on commits and diffs.
  - OpenAI API integration for natural language generation.
  - Customizable prompts and JIRA ticket inclusion.
  - Option to save summaries to a file.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request on the [GitHub repository](#) (replace `#` with the actual link).

## License

This project is licensed under the [MIT License](LICENSE).

---

## Following Extension Guidelines

Ensure you've read through the [extension guidelines](https://code.visualstudio.com/api/references/extension-guidelines) and follow the best practices for creating your extension.

## For More Information

- [Visual Studio Code's Extension API](https://code.visualstudio.com/api)
- [OpenAI API Documentation](https://beta.openai.com/docs/)

**Enjoy your enhanced code review process!**
