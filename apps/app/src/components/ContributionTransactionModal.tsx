import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, Clock, Send, Wallet, XCircle } from "lucide-react";

interface ContributionTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionStatus: "idle" | "signing" | "sending" | "confirming" | "confirmed" | "error";
  errorMessage?: string;
  title: string;
  successMessage?: string;
}

export function ContributionTransactionModal({
  isOpen,
  onClose,
  transactionStatus,
  errorMessage,
  title: modalTitle,
  successMessage,
}: ContributionTransactionModalProps) {
  const getStatusInfo = () => {
    switch (transactionStatus) {
      case "signing":
        return {
          icon: <Wallet className="h-8 w-8 text-blue-500" />,
          title: "Requesting Signature",
          description: "Please sign the transaction in your wallet.",
        };
      case "sending":
        return {
          icon: <Send className="h-8 w-8 text-blue-500" />,
          title: "Sending to Blockchain",
          description: "Your transaction is being sent to the blockchain network.",
        };
      case "confirming":
        return {
          icon: <Clock className="h-8 w-8 text-blue-500" />,
          title: "Waiting for Confirmation",
          description: "Waiting for the blockchain to confirm your transaction.",
        };
      case "confirmed":
        return {
          icon: <CheckCircle className="h-8 w-8 text-green-500" />,
          title: "Transaction Confirmed!",
          description: successMessage || "Your transaction has been successfully confirmed.",
        };
      case "error":
        return {
          icon: <XCircle className="h-8 w-8 text-red-500" />,
          title: "Transaction Failed",
          description: errorMessage || "An error occurred during the transaction.",
        };
      default:
        return {
          icon: <CheckCircle className="h-8 w-8 text-blue-500" />,
          title: "Processing Transaction",
          description: "Your transaction is being processed.",
        };
    }
  };

  const { icon, title, description } = getStatusInfo();

  const showCloseButton = transactionStatus !== "confirmed" && transactionStatus !== "error";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center py-6">
          <div className="mb-4">
            {icon}
          </div>
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-center text-gray-600 mb-6">{description}</p>
          
          {/* Progress indicators */}
          <div className="flex space-x-4 mb-6">
            <div className={`flex flex-col items-center ${transactionStatus === 'error' ? 'text-red-500' : transactionStatus !== 'idle' ? 'text-blue-500' : 'text-gray-300'}`}>
              <div className={`h-3 w-3 rounded-full ${transactionStatus === 'error' ? 'bg-red-500' : transactionStatus !== 'idle' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
              <span className="text-xs mt-1">Signature</span>
            </div>
            <div className={`flex flex-col items-center ${transactionStatus === 'error' ? 'text-red-500' : ['sending', 'confirming', 'confirmed'].includes(transactionStatus) ? 'text-blue-500' : 'text-gray-300'}`}>
              <div className={`h-3 w-3 rounded-full ${transactionStatus === 'error' ? 'bg-red-500' : ['sending', 'confirming', 'confirmed'].includes(transactionStatus) ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
              <span className="text-xs mt-1">Sending</span>
            </div>
            <div className={`flex flex-col items-center ${transactionStatus === 'error' ? 'text-red-500' : ['confirming', 'confirmed'].includes(transactionStatus) ? 'text-blue-500' : 'text-gray-300'}`}>
              <div className={`h-3 w-3 rounded-full ${transactionStatus === 'error' ? 'bg-red-500' : ['confirming', 'confirmed'].includes(transactionStatus) ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
              <span className="text-xs mt-1">Confirming</span>
            </div>
            <div className={`flex flex-col items-center ${transactionStatus === 'error' ? 'text-red-500' : transactionStatus === 'confirmed' ? 'text-blue-500' : 'text-gray-300'}`}>
              <div className={`h-3 w-3 rounded-full ${transactionStatus === 'error' ? 'bg-red-500' : transactionStatus === 'confirmed' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
              <span className="text-xs mt-1">Complete</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          {showCloseButton && (
            <Button 
              variant="outline"
              onClick={onClose}
            >
              Close
            </Button>
          )}
          {!showCloseButton && (
            <Button 
              variant="outline"
              onClick={onClose}
            >
              OK
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
