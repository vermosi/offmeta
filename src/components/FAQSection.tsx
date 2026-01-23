import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const FAQ_ITEMS = [
  {
    question: 'What is OffMeta?',
    answer:
      "OffMeta is a natural language search tool for Magic: The Gathering cards. Instead of learning complex Scryfall syntax, you can describe what you're looking for in plain English and OffMeta translates it into a valid search query.",
  },
  {
    question: 'How does natural language MTG card search work?',
    answer:
      "OffMeta uses AI to understand your search intent and converts it into Scryfall search syntax. For example, typing 'cheap green ramp spells' becomes a proper query filtering by color, card type, mana cost, and oracle text for mana-producing effects.",
  },
  {
    question: 'Is OffMeta free to use?',
    answer:
      'Yes, OffMeta is completely free to use. There are no accounts required, no subscriptions, and no limits on searches.',
  },
  {
    question: 'Where does OffMeta get its card data?',
    answer:
      'OffMeta uses the Scryfall API as its data source. Scryfall maintains a comprehensive, up-to-date database of all Magic: The Gathering cards including oracle text, prices, legalities, and card images.',
  },
  {
    question: 'Can I use OffMeta to search for Commander/EDH cards?',
    answer:
      "Yes! You can search for cards legal in any format including Commander, Standard, Modern, Legacy, and more. Simply mention the format in your search like 'commander legal board wipes under $5' or use the format filter chips.",
  },
];

export function FAQSection() {
  return (
    <section
      className="py-12 sm:py-16 border-t border-border/50"
      aria-labelledby="faq-heading"
    >
      <div className="container-main">
        <h2
          id="faq-heading"
          className="text-2xl sm:text-3xl font-semibold text-center mb-8 sm:mb-12"
        >
          Frequently Asked Questions
        </h2>
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full space-y-2">
            {FAQ_ITEMS.map((item, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border border-border/50 rounded-lg px-4 sm:px-6 bg-card/50"
              >
                <AccordionTrigger className="text-left text-base sm:text-lg font-medium hover:no-underline py-4 sm:py-5">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm sm:text-base pb-4 sm:pb-5 leading-relaxed">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
