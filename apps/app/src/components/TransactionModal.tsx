import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, Clock, Send, Wallet } from "lucide-react";
import { useState } from "react";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToPresale: () => void;
  presaleAddress?: string;
  transactionStatus: "idle" | "signing" | "sending" | "confirming" | "confirmed" | "error";
  errorMessage?: string;
}

export function TransactionModal({
  isOpen,
  onClose,
  onNavigateToPresale,
  presaleAddress,
  transactionStatus,
  errorMessage
}: TransactionModalProps) {
  const [isClosed, setIsClosed] = useState(false);

  const handleClose = () => {
    setIsClosed(true);
    onClose();
  };

  const getStatusInfo = () => {
    switch (transactionStatus) {
      case "signing":
        return {
          icon: <Wallet className="h-8 w-8 text-blue-500" />,
          title: "Requesting Signature",
          description: "Please sign the transaction in your wallet to create the presale"
        };
      case "sending":
        return {
          icon: <Send className="h-8 w-8 text-blue-500" />,
          title: "Sending to Blockchain",
          description: "Your transaction is being sent to the blockchain network"
        };
      case "confirming":
        return {
          icon: <Clock className="h-8 w-8 text-blue-500" />,
          title: "Waiting for Confirmation",
          description: "Waiting for the blockchain to confirm your transaction"
        };
      case "confirmed":
        return {
          icon: <CheckCircle className="h-8 w-8 text-green-500" />,
          title: "Presale Created Successfully!",
          description: "Your presale has been successfully created on the blockchain"
        };
      case "error":
        return {
          icon: <CheckCircle className="h-8 w-8 text-red-500" />,
          title: "Transaction Failed",
          description: errorMessage || "An error occurred while creating your presale"
        };
      default:
        return {
          icon: <CheckCircle className="h-8 w-8 text-blue-500" />,
          title: "Creating Presale",
          description: "Your presale is being created"
        };
    }
  };

  const { icon, title, description } = getStatusInfo();

  const showNavigateButton = transactionStatus === "confirmed" && presaleAddress;
  const showCloseButton = transactionStatus !== "confirmed" && transactionStatus !== "error";

  return (
    <Dialog open={isOpen && !isClosed} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Presale Transaction</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center py-6">
          <div className="mb-4">
            {icon}
          </div>
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-center text-gray-600 mb-6">{description}</p>
          
          {/* Progress indicators */}
          <div className="flex space-x-4 mb-6">
            <div className={`flex flex-col items-center ${transactionStatus !== 'idle' ? 'text-blue-500' : 'text-gray-300'}`}>
              <div className={`h-3 w-3 rounded-full ${transactionStatus !== 'idle' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
              <span className="text-xs mt-1">Signature</span>
            </div>
            <div className={`flex flex-col items-center ${['sending', 'confirming', 'confirmed'].includes(transactionStatus) ? 'text-blue-500' : 'text-gray-300'}`}>
              <div className={`h-3 w-3 rounded-full ${['sending', 'confirming', 'confirmed'].includes(transactionStatus) ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
              <span className="text-xs mt-1">Sending</span>
            </div>
            <div className={`flex flex-col items-center ${['confirming', 'confirmed'].includes(transactionStatus) ? 'text-blue-500' : 'text-gray-300'}`}>
              <div className={`h-3 w-3 rounded-full ${['confirming', 'confirmed'].includes(transactionStatus) ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
              <span className="text-xs mt-1">Confirming</span>
            </div>
            <div className={`flex flex-col items-center ${transactionStatus === 'confirmed' ? 'text-blue-500' : 'text-gray-300'}`}>
              <div className={`h-3 w-3 rounded-full ${transactionStatus === 'confirmed' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
              <span className="text-xs mt-1">Complete</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          {showNavigateButton && (
            <Button 
              onClick={() => {
                onNavigateToPresale();
                handleClose();
              }}
            >
              View Presale Details
            </Button>
          )}
          {showCloseButton && (
            <Button 
              variant="outline"
              onClick={handleClose}
            >
              Close
            </Button>
          )}
          {!showNavigateButton && !showCloseButton && (
            <Button 
              variant="outline"
              onClick={handleClose}
            >
              OK
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}