import { Search } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";

export function SearchButton() {
  const handleSearch = () => {
    console.log("search");
  };

  return (
    <IconButton aria-label="search" onClick={handleSearch}>
      <Search />
    </IconButton>
  );
}
