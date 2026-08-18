import { detectNonEnglishQuery } from './_shared/languageDetect.ts';
for (const q of ["tutores negros baratos","Sol Ring","las mejores cartas para sephiroth","criaturas rojas baratas"]) console.log(q, JSON.stringify(detectNonEnglishQuery(q)));
