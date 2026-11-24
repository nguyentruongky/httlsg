import { useWorkspaceRoute } from "./workspace/use-workspace-route";
import { useWorkspaceScroll } from "./workspace/use-workspace-scroll";
import { WorkspaceContent } from "./workspace/workspace-content";
import { WorkspaceLayout } from "./workspace/workspace-layout";
import { WorkspaceTabs } from "./workspace/workspace-tabs";

export function App() {
  const workspace = useWorkspaceRoute();
  useWorkspaceScroll(workspace);
  return (
    <WorkspaceLayout
      directory={workspace.directory}
      fixedLayout={workspace.fixedLayout}
      whiteBackground={Boolean(workspace.electionId)}
      scrutineer={workspace.scrutineer}
      navigation={<WorkspaceTabs workspace={workspace} />}
    >
      <WorkspaceContent workspace={workspace} />
    </WorkspaceLayout>
  );
}
