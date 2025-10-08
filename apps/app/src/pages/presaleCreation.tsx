import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { presaleSchema, PresaleFormData } from "@/schemas/presaleSchemas";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
// importing necessary wagmi for contracts integrations
import { usePublicClient, type BaseError } from "wagmi";
import PresaleFactoryABI from "@launchpad-platform/contracts/abi_ts/contracts/PresaleFactory.sol/PresaleFactory";
// importing our custom hook and ABI
import { usePresaleFactory } from "@/hooks/usePresaleFactory";
import { useNativeCurrency } from "@/hooks";
import { parseEther, parseEventLogs, formatEther, Address } from "viem";
import {
  formatNumberWithThousands,
  removeThousandSeparators,
} from "@/lib/utils";
import { FaucetButton } from "@/components/FaucetButton";
import { TransactionModal } from "@/components/TransactionModal";
import { ConfirmationModal } from "@/components/ConfirmationModal";

// Component to handle supply field with formatting
function SupplyField({
  field,
}: {
  field: { value: string; onChange: (val: string) => void };
}) {
  const [displayValue, setDisplayValue] = useState(
    formatNumberWithThousands(field.value)
  );

  return (
    <FormItem>
      <FormLabel>Initial Supply</FormLabel>
      <FormControl>
        <Input
          type="text"
          placeholder="Enter the initial supply"
          value={displayValue}
          onChange={(e) => {
            const rawValue = removeThousandSeparators(e.target.value);
            // Only update if the raw value is a valid number
            if (
              rawValue === "" ||
              (!isNaN(Number(rawValue)) && Number(rawValue) >= 0)
            ) {
              field.onChange(rawValue);
              setDisplayValue(e.target.value);
            }
          }}
          onBlur={(e) => {
            // Format the value on blur
            const rawValue = removeThousandSeparators(e.target.value);
            setDisplayValue(formatNumberWithThousands(rawValue));
          }}
        />
      </FormControl>
      <FormDescription>
        The total number of tokens that will be minted and sent to your wallet.
        This is not the maximum supply, the maximum supply is defined by the
        hard cap and token price. Note: The supply will be multiplied by 10^18 to account for 18 decimals.
      </FormDescription>
      <FormMessage />
    </FormItem>
  );
}

export default function PresaleCreation() {
  const client = usePublicClient();
  const nativeCurrencySymbol = useNativeCurrency();
  const navigate = useNavigate();
  const {
    contractAddress,
    createPresale,
    presaleCreationFee,
    isLoadingPresaleFee,
  } = usePresaleFactory();

  // State for modal and transaction status
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<
    "idle" | "signing" | "sending" | "confirming" | "confirmed" | "error"
  >("idle");
  const [presaleAddress, setPresaleAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);
  const [currentFormData, setCurrentFormData] = useState<PresaleFormData | null>(null);

  const form = useForm<PresaleFormData>({
    resolver: zodResolver(presaleSchema),
    defaultValues: {
      name: "",
      symbol: "",
      supply: "",
      price: "",
      hardCap: "",
      softCap: "",
      softCapPrice: "", // Added softCapPrice
      startTime: "",
      endTime: undefined,
      noTimeLimit: false,
      hasSoftCap: false, // Added hasSoftCap
    },
  });

  // Calculate maximum supply based on hardcap and token price
  const hardCap = form.watch("hardCap");
  const price = form.watch("price");
  let maxSupply = 0;
  if (hardCap && price && parseFloat(price) > 0) {
    maxSupply = parseFloat(hardCap) / parseFloat(price);
  }

  // Format the presale creation fee for display
  const formatFee = (fee: bigint | undefined | unknown) => {
    if (!fee || typeof fee !== 'bigint') return "0";
    return parseFloat(formatEther(fee)).toString();
  };

  // Function to handle form submission after confirmation
  const handleConfirmedSubmit = async (values: PresaleFormData) => {
    try {
      // Set the transaction status to "signing" and open the transaction modal
      setTransactionStatus("signing");
      setIsModalOpen(true);

      // Remove any formatting from the supply value before converting to BigInt
      const cleanSupply = values.supply.toString().replace(/\s/g, "");
      // Convert the supply to BigInt with 18 decimals
      const supplyWithDecimals = parseEther(cleanSupply); // parseEther handles 18 decimals by default
      const priceinETH = parseEther(values.price);
      const hardCapInETH = parseEther(values.hardCap);
      const softCapInETH = values.hasSoftCap
        ? parseEther(values.softCap)
        : parseEther("0"); // Conditionally set softCapInETH
      const softCapPriceInETH = values.hasSoftCap
        ? parseEther(values.softCapPrice)
        : parseEther("0"); // Conditionally set softCapPriceInETH

      // Convert date strings to Unix timestamps
      const startTimeUnix = Math.floor(
        new Date(values.startTime).getTime() / 1000
      );

      let endTimeUnix: number;
      if (values.noTimeLimit) {
        endTimeUnix = 0; // Send 0 to indicate no time limit
      } else if (values.endTime) {
        endTimeUnix = Math.floor(new Date(values.endTime).getTime() / 1000);
      } else {
        // This shouldn't happen due to form validation, but added for safety
        setError("End time is required unless 'No time limit' is selected");
        setTransactionStatus("error");
        return;
      }

      // Log the parameters being sent to the blockchain
      console.log("Creating Presale with parameters:");
      console.log("- Name:", values.name);
      console.log("- Symbol:", values.symbol);
      console.log("- Supply:", cleanSupply);
      console.log("- Price (ETH):", values.price, "->", priceinETH);
      console.log("- Hard Cap (ETH):", values.hardCap, "->", hardCapInETH);
      console.log(
        "- Soft Cap (ETH):",
        values.hasSoftCap ? values.softCap : "0",
        "->",
        softCapInETH
      ); // Updated softCap log
      console.log(
        "- Soft Cap Price (ETH):",
        values.hasSoftCap ? values.softCapPrice : "0",
        "->",
        softCapPriceInETH
      ); // Updated softCapPrice log
      console.log("- Start Time:", values.startTime, "-> Unix:", startTimeUnix);
      console.log(
        "- End Time:",
        values.noTimeLimit ? "No time limit (0)" : values.endTime,
        "-> Unix:",
        endTimeUnix
      );
      console.log("- No Time Limit:", values.noTimeLimit);
      console.log("- Full args array:", [
        {
          name: values.name,
          symbol: values.symbol,
          supply: supplyWithDecimals,
          price: priceinETH,
          hardCap: hardCapInETH,
          softCap: softCapInETH,
          startTime: BigInt(startTimeUnix),
          endTime: BigInt(endTimeUnix),
          softCapPrice: softCapPriceInETH,
        },
      ]);

      if (!contractAddress) {
        setError("Contract address is not available");
        setTransactionStatus("error");
        return;
      }

      // Call createPresale and wait for the transaction hash (this is where user signs)
      const hash = await createPresale({
        address: contractAddress,
        abi: PresaleFactoryABI,
        functionName: "createPresale",
        args: [
          {
            name: values.name,
            symbol: values.symbol,
            supply: supplyWithDecimals,
            price: priceinETH,
            hardCap: hardCapInETH,
            softCap: softCapInETH,
            startTime: BigInt(startTimeUnix),
            endTime: BigInt(endTimeUnix),
            softCapPrice: softCapPriceInETH,
          },
        ],
        value: presaleCreationFee as bigint,
      });

      // After signature, update status to "sending"
      setTransactionStatus("sending");

      // Wait for transaction confirmation (mining)
      setTransactionStatus("confirming");

      const confirmedReceipt = await client?.waitForTransactionReceipt({
        hash,
        confirmations: 2,
      });
      // Transaction confirmed, update status to "confirmed"
      setTransactionStatus("confirmed");

      // Parse logs to get the new presale address
      const parsedLogs = parseEventLogs({
        abi: PresaleFactoryABI,
        logs: confirmedReceipt!.logs,
        eventName: "PresaleCreated",
      });

      if (parsedLogs.length > 0) {
        // Access the presale address from the event args - properly handle the unknown type
        const event = parsedLogs[0];
        if (event && 'args' in event && event.args && typeof event.args === 'object' && 'presale' in event.args) {
          const presaleAddress = (event.args as { presale?: Address }).presale;
          if (presaleAddress) {
            setPresaleAddress(presaleAddress);
          }
        }
      }
    } catch (err) {
      console.error("Error creating presale:", err);
      setError(
        err instanceof Error
          ? err.message
          : (err as BaseError)?.shortMessage || "An unknown error occurred"
      );
      setTransactionStatus("error");
    }
  };

  // Function to handle form submission - shows confirmation modal instead of immediate transaction
  async function onSubmit(values: PresaleFormData) {
    // Ensure the values conform to the expected format for the confirmation modal
    const normalizedValues: PresaleFormData = {
      ...values,
      endTime: values.endTime || undefined,
      noTimeLimit: values.noTimeLimit || false,
      hasSoftCap: values.hasSoftCap || false
    };
    setCurrentFormData(normalizedValues);
    setIsConfirmationModalOpen(true);
  }

  const handleNavigateToPresale = () => {
    if (presaleAddress) {
      navigate({ to: `/presale-details/${presaleAddress}` });
    }
  };

  return (
    <>
      <Card className="w-full max-w-2xl mx-auto my-8">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle data-testid="create-presale-heading">Create a New Presale</CardTitle>
              <CardDescription>
                Fill out the form below to create a new presale for your token.
              </CardDescription>
            </div>
            <FaucetButton />
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your token name" {...field} />
                    </FormControl>
                    <FormDescription>
                      The name of the token for which you are creating a presale
                      (e.g., &quot;My Awesome Token&quot;).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="symbol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token Symbol</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter your token symbol" 
                        className="uppercase"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormDescription>
                      The symbol of the token (e.g., &quot;MAT&quot;). This is a
                      shorter, often 3-5 character, identifier.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="supply"
                render={({ field }) => <SupplyField field={field} />}
              />
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token Price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder={`Enter the token price in ${nativeCurrencySymbol}`}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The price of a single token in {nativeCurrencySymbol}. For
                      example, 0.001 {nativeCurrencySymbol} per token.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hardCap"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hard Cap ({nativeCurrencySymbol})</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder={`Enter the hard cap in ${nativeCurrencySymbol}`}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The maximum amount of {nativeCurrencySymbol} to be raised
                      in the presale. If this amount is reached, the presale
                      ends.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hasSoftCap"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Enable Soft Cap</FormLabel>
                      <FormDescription>
                        Check this to enable a soft cap for the presale.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {form.watch("hasSoftCap") && ( // Conditional rendering
                <>
                  <FormField
                    control={form.control}
                    name="softCap"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Soft Cap ({nativeCurrencySymbol})</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            placeholder={`Enter the soft cap in ${nativeCurrencySymbol}`}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          The minimum amount of {nativeCurrencySymbol} to be
                          raised in the presale for it to be considered
                          successful.
                        </FormDescription>
                        <FormDescription>
                          The presale owner will only be able to withdraw the
                          raised amount if the soft cap is defined and reached.
                        </FormDescription>
                        {form.watch("hasSoftCap") &&
                          !form.watch("noTimeLimit") && (
                            <FormDescription>
                              If a soft cap is defined and not reached by the
                              end of the presale, contributors will be able to
                              withdraw their contributed funds.
                            </FormDescription>
                          )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="softCapPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Soft Cap Price ({nativeCurrencySymbol})
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="any"
                            placeholder={`Enter the soft cap price in ${nativeCurrencySymbol}`}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          The price of a single token in {nativeCurrencySymbol}{" "}
                          if the soft cap is reached.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormDescription>
                      The start date and time of the presale.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      End Time{" "}
                      {form.watch("hasSoftCap") && (
                        <span className="text-red-500">*</span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        disabled={form.watch("noTimeLimit")}
                      />
                    </FormControl>
                    <FormDescription>
                      {form.watch("hasSoftCap")
                        ? "The end date and time of the presale. Required when Soft Cap is enabled."
                        : "The end date and time of the presale. Required unless &quot;No time limit&quot; is selected."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {!form.watch("hasSoftCap") && (
                <FormField
                  control={form.control}
                  name="noTimeLimit"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>No time limit</FormLabel>
                        <FormDescription>
                          Check this to set no end time for the presale
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              )}

              {maxSupply > 0 && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-800">
                    Presale Details
                  </h3>
                  <p className="text-sm text-blue-700">
                    Maximum Supply:{" "}
                    {formatNumberWithThousands(maxSupply.toFixed(0))} tokens
                  </p>
                  <p className="text-sm text-blue-700">
                    Based on Hard Cap of {hardCap} {nativeCurrencySymbol} and
                    Token Price of {price} {nativeCurrencySymbol} per token
                  </p>
                </div>
              )}
              <Button
                disabled={transactionStatus !== "idle" || isLoadingPresaleFee}
                type="submit"
                className="w-full"
              >
                {isLoadingPresaleFee
                  ? "Loading fee..."
                  : `Create Presale (${formatFee(
                      presaleCreationFee
                    )} ${nativeCurrencySymbol})`}
              </Button>
              <div className="mt-4 text-sm text-gray-600">
                <p className="font-medium">Fee Information:</p>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  <li>
                    The fee shown in parentheses (
                    {formatFee(presaleCreationFee)} {nativeCurrencySymbol}) is
                    the presale creation fee
                  </li>
                  <li>
                    You will also pay network fees (gas) to execute this
                    transaction
                  </li>
                  <li>
                    Additionally, when withdrawing raised funds, a 1% fee of the
                    total amount will be charged to the factory
                  </li>
                </ul>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Confirmation modal */}
      {currentFormData && (
        <ConfirmationModal
          isOpen={isConfirmationModalOpen}
          onClose={() => setIsConfirmationModalOpen(false)}
          onConfirm={() => {
            if (currentFormData) {
              handleConfirmedSubmit(currentFormData);
              setIsConfirmationModalOpen(false);
            }
          }}
          formData={currentFormData as unknown as PresaleFormData}
          fee={formatFee(presaleCreationFee)}
        />
      )}
      
      {/* Transaction modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onNavigateToPresale={handleNavigateToPresale}
        presaleAddress={presaleAddress || undefined}
        transactionStatus={transactionStatus}
        errorMessage={error}
      />
    </>
  );
}
