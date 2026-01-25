import { useState } from "react";
import { Captcha } from "./captcha";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";
import { Button } from "./button";
import { RefreshCw } from "lucide-react";

export function CaptchaDemo() {
  const [isVerified, setIsVerified] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [key, setKey] = useState(0);

  const handleVerify = (isValid: boolean) => {
    setIsVerified(isValid);
    if (!isValid && attempts > 0) {
      setAttempts(prev => prev + 1);
    } else if (isValid) {
      setAttempts(prev => prev + 1);
    }
  };

  const resetDemo = () => {
    setIsVerified(false);
    setAttempts(0);
    setKey(prev => prev + 1);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            CAPTCHA Component Demo
            <Button
              variant="outline"
              size="sm"
              onClick={resetDemo}
              className="ml-auto"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Reset Demo
            </Button>
          </CardTitle>
          <CardDescription>
            Interactive demonstration of the SwasthyaTrack CAPTCHA component
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-medium">Status:</span>
            <Badge variant={isVerified ? "default" : "secondary"}>
              {isVerified ? "✓ Verified" : "⏳ Pending"}
            </Badge>
            {attempts > 0 && (
              <Badge variant="outline">
                Attempts: {attempts}
              </Badge>
            )}
          </div>

          <Captcha
            key={key}
            onVerify={handleVerify}
            className="border rounded-lg p-4"
          />

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">How to use:</h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• <strong>Math problems:</strong> Calculate and enter the result</li>
              <li>• <strong>Text challenges:</strong> Type the characters shown (case-insensitive)</li>
              <li>• <strong>Refresh:</strong> Click the refresh button for a new challenge</li>
              <li>• <strong>Accessibility:</strong> Screen readers will announce the challenge</li>
            </ul>
          </div>

          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <h3 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">
              Security Features:
            </h3>
            <ul className="text-sm space-y-1 text-blue-800 dark:text-blue-200">
              <li>• Canvas-based rendering with visual noise</li>
              <li>• Random challenge generation (math + text)</li>
              <li>• Single-use challenges that refresh on failure</li>
              <li>• Accessibility compliant with ARIA labels</li>
              <li>• Bot-resistant design patterns</li>
            </ul>
          </div>

          {isVerified && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-green-800 dark:text-green-200 font-medium">
                  CAPTCHA verification successful!
                </span>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                The form would now be ready for submission.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Implementation Example</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-sm bg-muted p-4 rounded-lg overflow-x-auto">
            <code>{`import { Captcha } from "@/components/ui/captcha";

function LoginForm() {
  const [captchaVerified, setCaptchaVerified] = useState(false);

  const handleCaptchaVerify = (isValid: boolean) => {
    setCaptchaVerified(isValid);
    form.setValue("captchaVerified", isValid);
  };

  return (
    <form>
      {/* Other form fields */}
      
      <Captcha
        onVerify={handleCaptchaVerify}
        disabled={isLoading}
      />
      
      <Button 
        type="submit" 
        disabled={!captchaVerified}
      >
        Submit
      </Button>
    </form>
  );
}`}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}