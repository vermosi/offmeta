import { useMemo, useRef, useEffect, useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useTranslation } from '@/lib/i18n';

export function FAQSection() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
      ref={sectionRef}
      className="py-12 sm:py-16 lg:py-20"
      aria-labelledby="faq-heading"
    >
      <div className="container-main">
        <div className="text-center mb-8 sm:mb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-accent/20 bg-accent/5 text-accent text-xs font-medium mb-4">
            {t('faq.badge')}
          </span>
          <h2
            id="faq-heading"
            className="text-2xl sm:text-3xl lg:text-4xl font-semibold"
          >
            {t('faq.heading')}
          </h2>
        </div>
        <div
          className={`max-w-2xl mx-auto transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <Accordion type="single" collapsible className="w-full space-y-2">
            {faqItems.map((item, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border border-border/50 rounded-lg px-4 sm:px-6 bg-card/50 hover:border-accent/20 transition-colors duration-200"
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
