import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HelpCircle, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const syntaxCategories = [
  {
    title: "Colors",
    examples: [
      { syntax: "c:white", description: "White cards" },
      { syntax: "c:blue", description: "Blue cards" },
      { syntax: "c:black", description: "Black cards" },
      { syntax: "c:red", description: "Red cards" },
      { syntax: "c:green", description: "Green cards" },
      { syntax: "c:colorless", description: "Colorless cards" },
      { syntax: "c:multicolor", description: "Multicolored cards" },
      { syntax: "c:uw", description: "Blue and white cards" },
    ],
  },
  {
    title: "Card Types",
    examples: [
      { syntax: "t:creature", description: "Creatures" },
      { syntax: "t:instant", description: "Instants" },
      { syntax: "t:sorcery", description: "Sorceries" },
      { syntax: "t:artifact", description: "Artifacts" },
      { syntax: "t:enchantment", description: "Enchantments" },
      { syntax: "t:planeswalker", description: "Planeswalkers" },
      { syntax: "t:land", description: "Lands" },
      { syntax: "t:legendary", description: "Legendaries" },
    ],
  },
  {
    title: "Mana & Stats",
    examples: [
      { syntax: "cmc:3", description: "Mana value equals 3" },
      { syntax: "cmc>=5", description: "Mana value 5 or more" },
      { syntax: "cmc<3", description: "Mana value less than 3" },
      { syntax: "pow:4", description: "Power equals 4" },
      { syntax: "tou>=5", description: "Toughness 5 or more" },
      { syntax: "pow>tou", description: "Power greater than toughness" },
    ],
  },
  {
    title: "Rarity & Sets",
    examples: [
      { syntax: "r:common", description: "Common cards" },
      { syntax: "r:uncommon", description: "Uncommon cards" },
      { syntax: "r:rare", description: "Rare cards" },
      { syntax: "r:mythic", description: "Mythic rares" },
      { syntax: "s:dmu", description: "From Dominaria United" },
      { syntax: "s:one", description: "From Phyrexia: ONE" },
    ],
  },
  {
    title: "Text & Keywords",
    examples: [
      { syntax: "o:flying", description: "Has 'flying' in text" },
      { syntax: "o:\"draw a card\"", description: "Exact phrase match" },
      { syntax: "kw:trample", description: "Has trample keyword" },
      { syntax: "kw:deathtouch", description: "Has deathtouch keyword" },
      { syntax: "fo:destroy", description: "Full oracle text search" },
    ],
  },
  {
    title: "Format Legality",
    examples: [
      { syntax: "f:standard", description: "Legal in Standard" },
      { syntax: "f:modern", description: "Legal in Modern" },
      { syntax: "f:commander", description: "Legal in Commander" },
      { syntax: "f:pioneer", description: "Legal in Pioneer" },
      { syntax: "f:legacy", description: "Legal in Legacy" },
    ],
  },
  {
    title: "Price",
    examples: [
      { syntax: "usd<1", description: "Under $1" },
      { syntax: "usd>=10", description: "$10 or more" },
      { syntax: "eur<5", description: "Under €5" },
    ],
  },
  {
    title: "Combining",
    examples: [
      { syntax: "c:green t:creature cmc:1", description: "Green 1-drops" },
      { syntax: "t:dragon pow>=5", description: "Big dragons" },
      { syntax: "-c:blue t:instant", description: "Non-blue instants" },
      { syntax: "(c:r or c:g) t:creature", description: "Red or green creatures" },
    ],
  },
];

export function SyntaxHelper() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
          <HelpCircle className="h-4 w-4" />
          <span className="hidden sm:inline">Search Syntax</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="start">
        <div className="border-b border-border p-3">
          <h3 className="font-display font-semibold flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            Scryfall Search Syntax
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Use these operators to refine your search
          </p>
        </div>
        
        <div className="flex">
          {/* Category tabs */}
          <div className="w-32 border-r border-border bg-muted/30 p-1 space-y-0.5 max-h-80 overflow-y-auto">
            {syntaxCategories.map((category, index) => (
              <button
                key={category.title}
                onClick={() => setActiveCategory(index)}
                className={cn(
                  "w-full text-left px-2 py-1.5 text-xs rounded transition-colors",
                  activeCategory === index
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {category.title}
              </button>
            ))}
          </div>
          
          {/* Examples */}
          <div className="flex-1 p-2 max-h-80 overflow-y-auto">
            <div className="space-y-1">
              {syntaxCategories[activeCategory].examples.map((example) => (
                <div
                  key={example.syntax}
                  className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 group"
                >
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono text-primary flex-shrink-0">
                    {example.syntax}
                  </code>
                  <span className="text-xs text-muted-foreground truncate">
                    {example.description}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="border-t border-border p-2 bg-muted/30">
          <a
            href="https://scryfall.com/docs/syntax"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            View full syntax guide →
          </a>
        </div>
      </PopoverContent>
    </Popover>
  );
}
