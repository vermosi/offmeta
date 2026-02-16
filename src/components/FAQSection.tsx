import { useMemo } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useTranslation } from '@/lib/i18n';

export function FAQSection() {
  const { t } = useTranslation();

  const faqItems = useMemo(
    () => [
      { question: t('faq.q1'), answer: t('faq.a1') },
      { question: t('faq.q2'), answer: t('faq.a2') },
      { question: t('faq.q3'), answer: t('faq.a3') },
      { question: t('faq.q4'), answer: t('faq.a4') },
      { question: t('faq.q5'), answer: t('faq.a5') },
      { question: t('faq.q6'), answer: t('faq.a6') },
    ],
    [t],
  );

  return (
    <section
      className="py-10 sm:py-14 lg:py-16"
      aria-labelledby="faq-heading"
    >
      <div className="container-main">
        <h2
          id="faq-heading"
          className="text-2xl sm:text-3xl font-semibold text-center mb-8 sm:mb-10"
        >
          {t('faq.heading')}
        </h2>
        <div className="max-w-2xl mx-auto">
          <Accordion type="single" collapsible className="w-full space-y-2">
            {faqItems.map((item, index) => (
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
