import { useEffect } from "react";
import "./lang/i18n";
import { RailNav } from "./components/RailNav";
import { UpdateBanner } from "./components/UpdateBanner";
import { useAppStore } from "./store/useAppStore";
import { StartPage } from "./pages/StartPage";
import { ConfigsPage } from "./pages/ConfigsPage";
import { EditorPage } from "./pages/EditorPage";
import { ValidationPage } from "./pages/ValidationPage";
import { TestPage } from "./pages/TestPage";
import { SettingsPage } from "./pages/SettingsPage";

const PAGES = {
  start: StartPage,
  configs: ConfigsPage,
  editor: EditorPage,
  validation: ValidationPage,
  test: TestPage,
  settings: SettingsPage,
};

function App() {
  const page = useAppStore((s) => s.page);
  const Page = PAGES[page];

  useEffect(() => {
    const handler = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", handler);
    return () => document.removeEventListener("contextmenu", handler);
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-app_base font-IBMPlexSans text-text_primary">
      <UpdateBanner />
      <div className="flex min-h-0 flex-1">
        <RailNav />
        <div className="min-w-0 flex-1">
          <Page />
        </div>
      </div>
    </div>
  );
}

export default App;
