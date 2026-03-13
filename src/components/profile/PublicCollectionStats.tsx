/**
 * Aggregate collection stats for a public user profile.
 * Uses a SECURITY DEFINER function so individual cards stay private.
 * @module components/profile/PublicCollectionStats
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Package, DollarSign, Layers } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/lib/i18n';

interface CollectionStatsData {
  unique_cards: number;
  total_cards: number;
  estimated_value: number;
}

interface PublicCollectionStatsProps {
  userId: string;
}

export function PublicCollectionStats({ userId }: PublicCollectionStatsProps) {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ['public-collection-stats', userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_collection_stats', {
        target_user_id: userId,
      });
      if (error) throw error;
      return data as unknown as CollectionStatsData;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-5 w-24" />
        ))}
      </div>
    );
  }

  if (!data || (data.total_cards === 0 && data.unique_cards === 0)) return null;

  return (
    <div className="flex flex-wrap gap-4">
      <StatChip
        icon={<Package className="h-4 w-4" />}
        label={t('publicProfile.uniqueCards', 'Unique Cards')}
        value={data.unique_cards.toLocaleString()}
      />
      <StatChip
        icon={<Layers className="h-4 w-4" />}
        label={t('publicProfile.totalCards', 'Total Cards')}
        value={data.total_cards.toLocaleString()}
      />
      {data.estimated_value > 0 && (
        <StatChip
          icon={<DollarSign className="h-4 w-4" />}
          label={t('publicProfile.collectionValue', 'Est. Value')}
          value={`$${data.estimated_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        />
      )}
    </div>
  );
}

function StatChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
      {icon}
      <span>{value}</span>
      <span className="text-xs">{label}</span>
    </div>
  );
}
