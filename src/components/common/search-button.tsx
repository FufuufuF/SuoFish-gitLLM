import { IconButton } from "@mui/material";
import { Search } from "@mui/icons-material";

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
