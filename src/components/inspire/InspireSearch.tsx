import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";

interface SearchQuery {
  terms: string[];
  raw: string;
}

interface InspireSearchProps {
  onSearch: (query: SearchQuery) => void;
}

export const InspireSearch = ({ onSearch }: InspireSearchProps) => {
  const [searchValue, setSearchValue] = useState("");
  const [searchTerms, setSearchTerms] = useState<string[]>([]);

  const parseSearchQuery = (query: string): SearchQuery => {
    // Parse query like "portraits + golden hour + urban" into terms
    const terms = query
      .split("+")
      .map(term => term.trim())
      .filter(term => term.length > 0);
    
    return {
      terms,
      raw: query,
    };
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);
    const parsed = parseSearchQuery(value);
    setSearchTerms(parsed.terms);
    onSearch(parsed);
  };

  const handleClear = () => {
    setSearchValue("");
    setSearchTerms([]);
    onSearch({ terms: [], raw: "" });
  };

  const removeSearchTerm = (termToRemove: string) => {
    const newTerms = searchTerms.filter(term => term !== termToRemove);
    const newQuery = newTerms.join(" + ");
    setSearchValue(newQuery);
    setSearchTerms(newTerms);
    onSearch({
      terms: newTerms,
      raw: newQuery,
    });
  };

  return (
    <div className="w-full space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder="Search prompts, styles, artists..."
          value={searchValue}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 pr-10 w-full min-h-[44px]"
        />
        {searchValue && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </div>
      
      {searchTerms.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1">
          {searchTerms.map((term) => (
            <Badge
              key={term}
              variant="secondary"
              className="gap-1.5 pr-1 min-h-[32px] text-xs"
            >
              <span>{term}</span>
              <button
                onClick={() => removeSearchTerm(term)}
                className="hover:bg-muted rounded-sm p-0.5 transition-colors min-h-[24px] min-w-[24px] flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
