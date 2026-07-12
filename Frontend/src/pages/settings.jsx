import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { User, Shield, Bell, Moon, Sun, AlertCircle, Check } from "lucide-react";

export default function Settings() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  // Profile form state
  const [username, setUsername] = useState(user?.username || "");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // PIN form state
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinSuccess, setPinSuccess] = useState("");
  const [pinError, setPinError] = useState("");

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(
    document.documentElement.classList.contains("dark")
  );

  // Notifications state
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    pushAlerts: true,
    criticalOnly: false,
  });

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");

    if (!username.trim()) {
      setProfileError("Username cannot be empty");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/change-username`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          new_username: username.trim()
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to update username");
      }

      setProfileSuccess("Profile updated successfully");
      updateUser({ username: username.trim() });
    } catch (error) {
      setProfileError(error.message);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All password fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to update password");
      }

      setPasswordSuccess("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setPasswordError(error.message);
    }
  };

  const handleUpdatePin = (e) => {
    e.preventDefault();
    setPinError("");
    setPinSuccess("");

    if (!currentPin || !newPin || !confirmPin) {
      setPinError("All PIN fields are required");
      return;
    }

    if (currentPin !== user?.pin) {
      setPinError("Current PIN is incorrect");
      return;
    }

    if (newPin !== confirmPin) {
      setPinError("New PINs do not match");
      return;
    }

    if (newPin.length < 4 || newPin.length > 6) {
      setPinError("PIN must be 4-6 digits");
      return;
    }

    if (!/^\d+$/.test(newPin)) {
      setPinError("PIN must contain only numbers");
      return;
    }

    updateUser({ pin: newPin });
    setPinSuccess("Security PIN updated successfully");
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
  };

  const handleThemeToggle = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    // Store preference
    localStorage.setItem("aquawatch_theme", newMode ? "dark" : "light");
  };

  const handleNotificationChange = (key) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your account, security, and application preferences
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-fit">
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4 hidden sm:inline" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="w-4 h-4 hidden sm:inline" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4 hidden sm:inline" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            {isDarkMode ? (
              <Moon className="w-4 h-4 hidden sm:inline" />
            ) : (
              <Sun className="w-4 h-4 hidden sm:inline" />
            )}
            Appearance
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your account username and display settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                {profileSuccess && (
                  <Alert className="bg-green-50 border-green-200 text-green-800">
                    <Check className="h-4 w-4 text-green-600" />
                    <AlertDescription>{profileSuccess}</AlertDescription>
                  </Alert>
                )}
                {profileError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{profileError}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                  />
                </div>
                <Button type="submit">Update Profile</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your account password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                {passwordSuccess && (
                  <Alert className="bg-green-50 border-green-200 text-green-800">
                    <Check className="h-4 w-4 text-green-600" />
                    <AlertDescription>{passwordSuccess}</AlertDescription>
                  </Alert>
                )}
                {passwordError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{passwordError}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
                <Button type="submit">Update Password</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-500" />
                Security PIN
              </CardTitle>
              <CardDescription>
                Update your 4-6 digit security PIN for critical actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePin} className="space-y-4">
                {pinSuccess && (
                  <Alert className="bg-green-50 border-green-200 text-green-800">
                    <Check className="h-4 w-4 text-green-600" />
                    <AlertDescription>{pinSuccess}</AlertDescription>
                  </Alert>
                )}
                {pinError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{pinError}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="current-pin">Current PIN</Label>
                  <Input
                    id="current-pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter current PIN"
                    className="tracking-widest"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-pin">New PIN (4-6 digits)</Label>
                  <Input
                    id="new-pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter new PIN"
                    className="tracking-widest"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-pin">Confirm New PIN</Label>
                  <Input
                    id="confirm-pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="Confirm new PIN"
                    className="tracking-widest"
                  />
                </div>
                <Button type="submit">Update PIN</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Configure how you want to receive alerts and notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-alerts">Email Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive alerts via email
                  </p>
                </div>
                <Switch
                  id="email-alerts"
                  checked={notifications.emailAlerts}
                  onCheckedChange={() => handleNotificationChange("emailAlerts")}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push-alerts">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive browser push notifications
                  </p>
                </div>
                <Switch
                  id="push-alerts"
                  checked={notifications.pushAlerts}
                  onCheckedChange={() => handleNotificationChange("pushAlerts")}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="critical-only">Critical Alerts Only</Label>
                  <p className="text-sm text-muted-foreground">
                    Only notify for critical severity alerts
                  </p>
                </div>
                <Switch
                  id="critical-only"
                  checked={notifications.criticalOnly}
                  onCheckedChange={() => handleNotificationChange("criticalOnly")}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isDarkMode ? (
                  <Moon className="w-5 h-5 text-primary" />
                ) : (
                  <Sun className="w-5 h-5 text-primary" />
                )}
                Theme Preference
              </CardTitle>
              <CardDescription>
                Choose your preferred application theme
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="dark-mode">
                    {isDarkMode ? "Dark Mode" : "Light Mode"}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Currently using {isDarkMode ? "dark" : "light"} theme
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Sun className={["w-4 h-4", isDarkMode ? "text-muted-foreground" : "text-amber-500"].join(" ")} />
                  <Switch
                    id="dark-mode"
                    checked={isDarkMode}
                    onCheckedChange={handleThemeToggle}
                  />
                  <Moon className={["w-4 h-4", isDarkMode ? "text-indigo-400" : "text-muted-foreground"].join(" ")} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
