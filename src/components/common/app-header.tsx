import { ThemeToggle } from "./theme-toggle";

export function AppHeader() {
  return (
    <div className="flex items-center justify-between border-b border-divider bg-bg-default/60 px-4 py-2 backdrop-blur-md">
      <h6 className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-lg font-semibold text-transparent">SuoFish</h6>
      <ThemeToggle />
    </div>
  );
}
