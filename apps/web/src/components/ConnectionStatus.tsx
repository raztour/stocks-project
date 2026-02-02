import { ConnectionStatus as Status } from '@crypto-tracker/shared-types';
import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  status: Status;
}

export function ConnectionStatus({ status }: ConnectionStatusProps) {
  const statusConfig = {
    connected: {
      color: 'bg-green-500',
      text: 'Connected',
      textColor: 'text-green-700 dark:text-green-400',
    },
    disconnected: {
      color: 'bg-red-500',
      text: 'Disconnected',
      textColor: 'text-red-700 dark:text-red-400',
    },
    reconnecting: {
      color: 'bg-yellow-500',
      text: 'Reconnecting...',
      textColor: 'text-yellow-700 dark:text-yellow-400',
    },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            config.color,
            status === 'reconnecting' && 'animate-pulse'
          )}
        />
        <span className={cn('font-medium', config.textColor)}>{config.text}</span>
      </div>
    </div>
  );
}
