import { useAccount } from 'wagmi';
import { Skeleton } from '../components/ui/skeleton';
import { usePresaleFactory } from '@/hooks/usePresaleFactory';
import { TokenCard } from '@/components/TokenCard';

export function MyTokens() {
  const { address: userAddress } = useAccount();
  const { 
    userCreatedTokens, 
    isLoadingUserCreatedTokens: isLoading, 
    isErrorUserCreatedTokens: isError 
  } = usePresaleFactory();

  if (isLoading) return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">My Created Presales</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-40 w-full" />
        ))}
      </div>
    </div>
  );
  if (isError) return <div>Error loading tokens.</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">My Created Presales</h1>
      {userCreatedTokens && userCreatedTokens.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {userCreatedTokens.map((tokenAddress: any) => (
            <TokenCard key={tokenAddress} tokenAddress={tokenAddress} />
          ))}
        </div>
      ) : (
        <p>You haven&apos;t created any presales yet.</p>
      )}
    </div>
  );
}
