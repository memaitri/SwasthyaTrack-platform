import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface CaptchaProps {
  onVerify: (isValid: boolean) => void;
  className?: string;
  disabled?: boolean;
}

// Generate random math expression
const generateMathExpression = () => {
  const operations = ['+', '-', '*'];
  const operation = operations[Math.floor(Math.random() * operations.length)];
  
  let num1: number, num2: number, answer: number;
  
  switch (operation) {
    case '+':
      num1 = Math.floor(Math.random() * 50) + 1;
      num2 = Math.floor(Math.random() * 50) + 1;
      answer = num1 + num2;
      break;
    case '-':
      num1 = Math.floor(Math.random() * 50) + 25;
      num2 = Math.floor(Math.random() * 25) + 1;
      answer = num1 - num2;
      break;
    case '*':
      num1 = Math.floor(Math.random() * 10) + 1;
      num2 = Math.floor(Math.random() * 10) + 1;
      answer = num1 * num2;
      break;
    default:
      num1 = 1;
      num2 = 1;
      answer = 2;
  }
  
  return {
    expression: `${num1} ${operation} ${num2}`,
    answer
  };
};

// Generate random string with noise
const generateNoisyString = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const length = Math.floor(Math.random() * 2) + 5; // 5-6 characters
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
};

export function Captcha({ onVerify, className, disabled = false }: CaptchaProps) {
  const [challenge, setChallenge] = useState<{ type: 'math' | 'text'; data: any }>({ type: 'math', data: generateMathExpression() });
  const [userInput, setUserInput] = useState("");
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate new challenge
  const refreshChallenge = useCallback(() => {
    const challengeType = Math.random() > 0.5 ? 'math' : 'text';
    
    if (challengeType === 'math') {
      setChallenge({ type: 'math', data: generateMathExpression() });
    } else {
      setChallenge({ type: 'text', data: generateNoisyString() });
    }
    
    setUserInput("");
    setIsValid(null);
    onVerify(false);
  }, [onVerify]);

  // Draw challenge on canvas
  const drawChallenge = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add noise lines
    ctx.strokeStyle = '#e9ecef';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.stroke();
    }

    // Draw challenge text
    const text = challenge.type === 'math' ? challenge.data.expression : challenge.data;
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = '#374151';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Add slight rotation and positioning variation
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((Math.random() - 0.5) * 0.3);
    ctx.fillText(text, 0, 0);
    ctx.restore();

    // Add noise dots
    ctx.fillStyle = '#d1d5db';
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.arc(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        Math.random() * 2 + 1,
        0,
        2 * Math.PI
      );
      ctx.fill();
    }
  }, [challenge]);

  // Verify user input
  const verifyInput = useCallback((input: string) => {
    if (!input.trim()) {
      setIsValid(null);
      onVerify(false);
      return;
    }

    let isCorrect = false;
    
    if (challenge.type === 'math') {
      isCorrect = parseInt(input.trim()) === challenge.data.answer;
    } else {
      isCorrect = input.trim().toUpperCase() === challenge.data.toUpperCase();
    }

    setIsValid(isCorrect);
    onVerify(isCorrect);
  }, [challenge, onVerify]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUserInput(value);
    verifyInput(value);
  };

  // Initialize and refresh challenge
  useEffect(() => {
    refreshChallenge();
  }, []);

  // Draw challenge when it changes
  useEffect(() => {
    drawChallenge();
  }, [challenge, drawChallenge]);

  // Focus input when challenge refreshes
  useEffect(() => {
    if (inputRef.current && !disabled) {
      inputRef.current.focus();
    }
  }, [challenge, disabled]);

  return (
    <div className={cn("space-y-3", className)}>
      <Label htmlFor="captcha-input" className="text-sm font-medium">
        Security Verification
      </Label>
      
      <div className="flex items-center gap-3">
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={200}
            height={60}
            className="border border-border rounded-md bg-muted"
            aria-label={`CAPTCHA challenge: ${challenge.type === 'math' ? `Solve ${challenge.data.expression}` : `Enter the text shown`}`}
          />
          <div className="sr-only" aria-live="polite">
            {challenge.type === 'math' 
              ? `Math problem: ${challenge.data.expression}. Enter the result.`
              : `Text verification: Enter the characters shown in the image.`
            }
          </div>
        </div>
        
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={refreshChallenge}
          disabled={disabled}
          aria-label="Refresh CAPTCHA challenge"
          title="Get a new challenge"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        <Input
          ref={inputRef}
          id="captcha-input"
          type="text"
          placeholder={challenge.type === 'math' ? "Enter the result" : "Enter the text"}
          value={userInput}
          onChange={handleInputChange}
          disabled={disabled}
          className={cn(
            "transition-colors",
            isValid === true && "border-green-500 focus:border-green-500",
            isValid === false && "border-red-500 focus:border-red-500"
          )}
          aria-describedby="captcha-help"
          autoComplete="off"
          spellCheck={false}
        />
        
        <div id="captcha-help" className="text-xs text-muted-foreground">
          {challenge.type === 'math' 
            ? "Solve the math problem shown above"
            : "Enter the characters exactly as shown (case insensitive)"
          }
        </div>

        {isValid === false && userInput.trim() && (
          <div className="text-xs text-red-600" role="alert">
            Incorrect answer. Please try again or refresh for a new challenge.
          </div>
        )}

        {isValid === true && (
          <div className="text-xs text-green-600" role="status">
            ✓ Verification successful
          </div>
        )}
      </div>
    </div>
  );
}