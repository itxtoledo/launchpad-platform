import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useNativeCurrency } from "@/hooks";

interface ContributionConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  tokenAmount: string;
  ethAmount: string;
  tokenSymbol: string;
}

export function ContributionConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  tokenAmount,
  ethAmount,
  tokenSymbol,
}: ContributionConfirmationModalProps) {
  const nativeCurrencySymbol = useNativeCurrency();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Contribution</DialogTitle>
          <DialogDescription>
            Please review your contribution details below before proceeding.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 my-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-gray-500 text-sm">You are buying</h4>
            <p className="font-bold">{tokenAmount} {tokenSymbol}</p>
          </div>
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-gray-500 text-sm">Total cost</h4>
            <p className="font-bold">{ethAmount} {nativeCurrencySymbol}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            Confirm Contribution
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
