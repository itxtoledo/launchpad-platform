import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatNumberWithThousands } from "@/lib/utils";
import { useNativeCurrency } from "@/hooks";

interface PresaleFormData {
  name: string;
  symbol: string;
  supply: string;
  price: string;
  hardCap: string;
  softCap: string;
  softCapPrice: string;
  startTime: string;
  endTime: string | undefined;
  noTimeLimit: boolean;
  hasSoftCap: boolean;
}

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  formData: PresaleFormData;
  fee: string;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  formData,
  fee,
}: ConfirmationModalProps) {
  const nativeCurrencySymbol = useNativeCurrency();

  // Format the time properly for display
  const formatDateTime = (dateTimeString: string | undefined) => {
    if (!dateTimeString) return "Not set";
    return new Date(dateTimeString).toLocaleString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirm Presale Creation</DialogTitle>
          <DialogDescription>
            Please review the presale details below before proceeding with the
            creation.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 my-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-500 text-sm">Token Name</h4>
              <p>{formData.name}</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-500 text-sm">Token Symbol</h4>
              <p>{formData.symbol}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-500 text-sm">Initial Supply</h4>
              <p>{formatNumberWithThousands(formData.supply)}</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-500 text-sm">Token Price ({nativeCurrencySymbol})</h4>
              <p>{formData.price}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-500 text-sm">Hard Cap ({nativeCurrencySymbol})</h4>
              <p>{formData.hardCap}</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-500 text-sm">Soft Cap Enabled</h4>
              <p>{formData.hasSoftCap ? "Yes" : "No"}</p>
            </div>
          </div>

          {formData.hasSoftCap && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-500 text-sm">Soft Cap ({nativeCurrencySymbol})</h4>
                  <p>{formData.softCap}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-500 text-sm">Soft Cap Price ({nativeCurrencySymbol})</h4>
                  <p>{formData.softCapPrice}</p>
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-500 text-sm">Start Time</h4>
              <p>{formatDateTime(formData.startTime)}</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-500 text-sm">
                {formData.hasSoftCap ? "End Time" : formData.noTimeLimit ? "End Time" : "End Time *"}
              </h4>
              <p>
                {formData.noTimeLimit
                  ? "No time limit"
                  : formatDateTime(formData.endTime)}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Presale Creation Fee ({nativeCurrencySymbol}):</h4>
              <p className="font-bold">{fee}</p>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              You will also pay network fees (gas) to execute this transaction
            </p>
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
            Continue & Create Presale
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}