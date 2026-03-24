'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { ChevronDown, Sparkles, FlaskConical, HandHeart, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccordionItemProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}

function AccordionItem({ id, title, icon, children, isOpen, onToggle }: AccordionItemProps): JSX.Element {
  return (
    <div className="border-b border-neutral-200 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full py-5 flex items-center justify-between text-left group"
        aria-expanded={isOpen}
        aria-controls={`accordion-content-${id}`}
      >
        <div className="flex items-center gap-3">
          <span className="text-accent-gold">{icon}</span>
          <span className="font-accent font-semibold text-sm tracking-wide uppercase text-primary-800 group-hover:text-accent-gold transition-colors">
            {title}
          </span>
        </div>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="text-neutral-400 group-hover:text-primary-800 transition-colors"
        >
          <ChevronDown className="w-5 h-5" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={`accordion-content-${id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-6 text-neutral-600 leading-relaxed">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export interface ProductAccordionsProps {
  description: string;
  descriptionHtml?: string;
  benefits?: string[];
  ingredients?: string;
  howToUse?: string;
}

export function ProductAccordions({
  description,
  descriptionHtml,
  benefits,
  ingredients,
  howToUse,
}: ProductAccordionsProps): JSX.Element {
  const t = useTranslations('products');
  const tCommon = useTranslations('common');
  const [openId, setOpenId] = useState<string | null>('description');

  const handleToggle = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <div className="divide-y divide-neutral-200 border-t border-b border-neutral-200">
      {/* Description Luxe */}
      <AccordionItem
        id="description"
        title={t('details.description')}
        icon={<Sparkles className="w-5 h-5" />}
        isOpen={openId === 'description'}
        onToggle={() => handleToggle('description')}
      >
        {descriptionHtml ? (
          <div
            className="prose prose-sm max-w-none prose-p:text-neutral-600 prose-strong:text-primary-800 prose-ul:mt-4 prose-li:text-neutral-600"
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />
        ) : (
          <p>{description}</p>
        )}

        {benefits && benefits.length > 0 && (
          <div className="mt-6 pt-6 border-t border-neutral-100">
            <h4 className="font-accent font-semibold text-xs tracking-wide uppercase text-primary-800 mb-4">
              {t('details.benefits')}
            </h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {benefits.map((benefit, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-2 text-sm"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-gold mt-2 flex-shrink-0" />
                  <span>{benefit}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        )}
      </AccordionItem>

      {/* Composition (INCI) */}
      {ingredients && (
        <AccordionItem
          id="ingredients"
          title={t('details.ingredients')}
          icon={<FlaskConical className="w-5 h-5" />}
          isOpen={openId === 'ingredients'}
          onToggle={() => handleToggle('ingredients')}
        >
          <div className="space-y-4">
            <p className="text-sm text-neutral-500 italic">
              {t('ingredientsList')}
            </p>
            <p className="text-xs font-mono bg-neutral-50 p-4 rounded-lg leading-relaxed">
              {ingredients}
            </p>
          </div>
        </AccordionItem>
      )}

      {/* Conseils d'Application */}
      {howToUse && (
        <AccordionItem
          id="howToUse"
          title={t('details.howToUse')}
          icon={<HandHeart className="w-5 h-5" />}
          isOpen={openId === 'howToUse'}
          onToggle={() => handleToggle('howToUse')}
        >
          <div className="space-y-4">
            <p className="whitespace-pre-line">{howToUse}</p>
          </div>
        </AccordionItem>
      )}

      {/* Livraison & Retours */}
      <AccordionItem
        id="shipping"
        title={t('shippingReturns.title')}
        icon={<Truck className="w-5 h-5" />}
        isOpen={openId === 'shipping'}
        onToggle={() => handleToggle('shipping')}
      >
        <div className="space-y-6">
          {/* Shipping */}
          <div>
            <h4 className="font-semibold text-primary-800 mb-2">
              {t('shippingReturns.shippingTitle')}
            </h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                {t('shippingReturns.freeShipping')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-gold" />
                {t('shippingReturns.standardDelivery')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-gold" />
                {t('shippingReturns.expressDelivery')}
              </li>
            </ul>
          </div>

          {/* Returns */}
          <div>
            <h4 className="font-semibold text-primary-800 mb-2">
              {t('shippingReturns.returnsTitle')}
            </h4>
            <p className="text-sm">
              {t('shippingReturns.returnsPolicy')}
            </p>
          </div>
        </div>
      </AccordionItem>
    </div>
  );
}
