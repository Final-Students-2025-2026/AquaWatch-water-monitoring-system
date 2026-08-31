import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertCircle, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function PinModal({ isOpen, onClose, onVerify, action, description }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const { verifyPin } = useAuth();

  useEffect(() => {
    if (isOpen) {
      setPin("");
      setError("");
      setIsVerifying(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!pin || pin.length < 4) {
      setError("PIN must be at least 4 digits");
      return;
    }

    setIsVerifying(true);

    await new Promise((resolve) => setTimeout(resolve, 300));

    if (verifyPin(pin)) {
      onVerify();
      onClose();
    } else {
      setError("Invalid PIN. Please try again.");
      setPin("");
    }

    setIsVerifying(false);
  };

  const handlePinChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 6) {
      setPin(value);
      setError("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <DialogTitle>Security Verification</DialogTitle>
              <DialogDescription>
                {description || `Enter your security PIN to ${action}`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <Alert variant="destructive" className="text-sm">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="security-pin">Security PIN</Label>
            <Input
              id="security-pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Enter 4-6 digit PIN"
              value={pin}
              onChange={handlePinChange}
              maxLength={6}
              autoFocus
              className="text-center text-lg tracking-widest h-12"
            />
            <p className="text-xs text-muted-foreground text-center">
              Enter your 4-6 digit security PIN
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isVerifying}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={pin.length < 4 || isVerifying}
            >
              {isVerifying ? "Verifying..." : "Verify"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default PinModal;
