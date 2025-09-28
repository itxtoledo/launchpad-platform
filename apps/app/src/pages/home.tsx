import { Button } from "@/components/ui/button";
import { useState } from "react";

import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { useReadContract } from "wagmi";
import { type Address } from "viem";

import presaleFactoryAbi from "@launchpad-platform/contracts/abi_ts/contracts/PresaleFactory.sol/PresaleFactory";
import { FaucetButton } from "../components/FaucetButton";
import { PresaleCard } from "@/components/PresaleCard";

export default function Home() {
  const [page, setPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc"); // "desc" for decreasing by creation, "asc" for increasing by creation

  // Use separate hooks for each function to properly type them
  const { 
    data: presalesAsc, 
    isLoading: isLoadingAsc 
  } = useReadContract({
    address: import.meta.env.VITE_PRESALE_FACTORY,
    abi: presaleFactoryAbi,
    functionName: "getPaginatedPresales",
    args: [BigInt(page)],
  }) as { data: Address[] | undefined; isLoading: boolean };
  
  const { 
    data: presalesDesc, 
    isLoading: isLoadingDesc 
  } = useReadContract({
    address: import.meta.env.VITE_PRESALE_FACTORY,
    abi: presaleFactoryAbi,
    functionName: "getPaginatedPresalesDecreasingByCreation",
    args: [BigInt(page), BigInt(10)],
  }) as { data: Address[] | undefined; isLoading: boolean };

  const presaleAddresses = sortOrder === "desc" ? presalesDesc : presalesAsc;
  const isLoadingPresaleAddresses = sortOrder === "desc" ? isLoadingDesc : isLoadingAsc;

  const isLoading = isLoadingPresaleAddresses;

  return (
    <div className="container mx-auto my-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold">Welcome to Presale Platform</h1>
        <div className="flex items-center justify-center mt-4">
          <p className="text-lg text-muted-foreground">
            Discover and participate in the latest presales, invest in promising
            projects, and manage your investments with ease.
          </p>
          <FaucetButton />
        </div>
      </div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Active Presales</h2>
        <Button
          variant="outline"
          onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
        >
          Sort: {sortOrder === "desc" ? "Newest First" : "Oldest First"}
        </Button>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <div className="p-6">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-10 w-full mt-4" />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {presaleAddresses && presaleAddresses.length > 0 ? (
            presaleAddresses.map((address, index) => (
              <PresaleCard key={index} presaleAddress={address as Address} />
            ))
          ) : (
            <p>No presales found.</p>
          )}
        </div>
      )}
      <div className="flex justify-between mt-4">
        <Button
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          disabled={page === 1}
        >
          Previous Page
        </Button>
        <Button
          onClick={() => setPage((prev) => prev + 1)}
          disabled={presaleAddresses && presaleAddresses.length < 10}
        >
          Next Page
        </Button>
      </div>
    </div>
  );
}
