/**
 * Type shims for packages that don't ship their own declarations.
 *
 * markdown-it is typed via the `@types/markdown-it` dev-dependency. Only the
 * task-lists plugin lacks types, so we declare the minimal surface we use.
 */

declare module "markdown-it-task-lists" {
  import type MarkdownIt from "markdown-it";

  interface TaskListsOptions {
    /** Render checkboxes as enabled (clickable) instead of disabled. Default: false. */
    enabled?: boolean;
    /** Wrap the list item text in a <label>. Default: false. */
    label?: boolean;
    /** Place the <label> after the checkbox. Default: false. */
    labelAfter?: boolean;
  }

  const taskLists: (md: MarkdownIt, options?: TaskListsOptions) => void;
  export default taskLists;
}
