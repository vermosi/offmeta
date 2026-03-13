/**
 * Price alert button for the card modal purchase section.
 * Allows users to set a target price and get notified when it drops.
 * @module components/CardModal/PriceAlertButton
 */

import { useState, memo } from 'react';
import { Bell, BellOff, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAuth } from '@/hooks/useAuth';
import {
  useCardPriceAlerts,
  useCreatePriceAlert,
  useDeletePriceAlert,
} from '@/hooks/usePriceAlerts';
import { useTranslation } from '@/lib/i18n';

interface PriceAlertButtonProps {
  cardName: string;
  currentPrice?: string;
  scryfallId?: string;
}

export const PriceAlertButton = memo(function PriceAlertButton({
  cardName,
  currentPrice,
  scryfallId,
}: PriceAlertButtonProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const alerts = useCardPriceAlerts(cardName);
  const createAlert = useCreatePriceAlert();
  const deleteAlert = useDeletePriceAlert();
  const [open, setOpen] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');

  if (!user) return null;

  const hasActiveAlert = alerts.length > 0;

  const handleCreate = () => {
    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) return;
    createAlert.mutate(
      { cardName, targetPrice: price, direction: 'below', scryfallId },
      { onSuccess: () => { setOpen(false); setTargetPrice(''); } },
    );
  };

  const handleRemove = () => {
    if (alerts[0]) {
      deleteAlert.mutate(alerts[0].id, {
        onSuccess: () => setOpen(false),
      });
    }
  };

  const defaultPrice = currentPrice
    ? (parseFloat(currentPrice) * 0.8).toFixed(2)
    : '';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={hasActiveAlert ? 'default' : 'outline'}
          size="sm"
          className="gap-1.5"
        >
          {hasActiveAlert ? (
            <>
              <Check className="h-3.5 w-3.5" />
              {t('priceAlert.active', 'Alert Set')}
            </>
          ) : (
            <>
              <Bell className="h-3.5 w-3.5" />
              {t('priceAlert.set', 'Price Alert')}
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-3" align="start">
        {hasActiveAlert ? (
          <>
            <p className="text-sm text-foreground">
              {t('priceAlert.alertActiveFor', 'Alert active for')} <strong>{cardName}</strong>
            </p>
            <p className="text-xs text-muted-foreground">
              {t('priceAlert.targetLabel', 'Target')}: ${alerts[0].target_price} ({alerts[0].direction})
            </p>
            <Button
              variant="destructive"
              size="sm"
              className="w-full gap-1.5"
              onClick={handleRemove}
              disabled={deleteAlert.isPending}
            >
              <BellOff className="h-3.5 w-3.5" />
              {t('priceAlert.remove', 'Remove Alert')}
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-foreground">
              {t('priceAlert.notifyWhen', 'Notify when price drops below:')}
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="99999"
                  placeholder={defaultPrice || '5.00'}
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="pl-6 h-8 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
              </div>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={createAlert.isPending || !targetPrice}
                className="h-8"
              >
                {t('priceAlert.save', 'Set')}
              </Button>
            </div>
            {currentPrice && (
              <p className="text-[10px] text-muted-foreground">
                {t('priceAlert.currentPrice', 'Current price')}: ${currentPrice}
              </p>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
});
