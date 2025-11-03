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
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder='Search prompts (use "+" for AND, e.g., "portraits + golden hour")'
          value={searchValue}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 pr-10 glass-strong"
        />
        {searchValue && (
          <Button
            size="sm"
            variant="ghost"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {searchTerms.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground">Searching for:</span>
          {searchTerms.map((term, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="gap-1 pr-1"
            >
              {term}
              <button
                onClick={() => removeSearchTerm(term)}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
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
