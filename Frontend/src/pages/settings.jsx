import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { User, Shield, Bell, Moon, Sun, AlertCircle, Check, X, Settings2, Eye, EyeOff } from "lucide-react";

export function SettingsModal({ open, onOpenChange }) {
  const { user, updateUser } = useAuth();
  const [activeSection, setActiveSection] = useState("profile");

  // Profile form state
  const [username, setUsername] = useState(user?.username || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [profilePicture, setProfilePicture] = useState(user?.profile_picture || "");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // PIN form state
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinSuccess, setPinSuccess] = useState("");
  const [pinError, setPinError] = useState("");
  const [securitySubTab, setSecuritySubTab] = useState("username");

  // Login username state
  const [loginUsername, setLoginUsername] = useState(user?.username || "");
  const [currentLoginUsername, setCurrentLoginUsername] = useState("");
  const [loginUsernameSuccess, setLoginUsernameSuccess] = useState("");
  const [loginUsernameError, setLoginUsernameError] = useState("");

  // Sync form state with user data
  useEffect(() => {
    setUsername(user?.username || "");
    setEmail(user?.email || "");
    setPhone(user?.phone || "");
    setProfilePicture(user?.profile_picture || "");
    setLoginUsername(user?.username || "");
  }, [user]);

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

  const handleProfilePictureUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setProfileError("Please upload an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setProfileError("Image size should be less than 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePicture(reader.result);
      setProfileError("");
    };
    reader.onerror = () => {
      setProfileError("Failed to read image file");
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");

    if (!username.trim()) {
      setProfileError("Company name cannot be empty");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      
      // Update username (company name)
      const usernameResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/change-username/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          new_username: username.trim()
        })
      });

      if (!usernameResponse.ok) {
        const error = await usernameResponse.json();
        throw new Error(error.detail || "Failed to update company name");
      }

      // Update email if provided
      if (email.trim()) {
        const emailResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/change-email/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            email: email.trim()
          })
        });

        if (!emailResponse.ok) {
          const error = await emailResponse.json();
          throw new Error(error.detail || "Failed to update email");
        }
      }

      // Update phone if provided
      if (phone.trim()) {
        const phoneResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/change-phone/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            phone: phone.trim()
          })
        });

        if (!phoneResponse.ok) {
          const error = await phoneResponse.json();
          throw new Error(error.detail || "Failed to update phone");
        }
      }

      // Update profile picture if provided
      if (profilePicture.trim()) {
        const pictureResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/change-profile-picture/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            profile_picture: profilePicture.trim()
          })
        });

        if (!pictureResponse.ok) {
          const error = await pictureResponse.json();
          throw new Error(error.detail || "Failed to update profile picture");
        }
      }

      setProfileSuccess("Profile updated successfully");
      updateUser({ 
        username: username.trim(),
        email: email.trim(),
        phone: phone.trim(),
        profile_picture: profilePicture.trim()
      });
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
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/change-password/`, {
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

  const handleUpdateLoginUsername = async (e) => {
    e.preventDefault();
    setLoginUsernameError("");
    setLoginUsernameSuccess("");

    if (!currentLoginUsername.trim()) {
      setLoginUsernameError("Current login username is required");
      return;
    }

    if (!loginUsername.trim()) {
      setLoginUsernameError("New login username cannot be empty");
      return;
    }

    if (currentLoginUsername.trim() !== user?.username) {
      setLoginUsernameError("Current login username does not match");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/change-username/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          new_username: loginUsername.trim()
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to update login username");
      }

      setLoginUsernameSuccess("Login username updated successfully");
      updateUser({ username: loginUsername.trim() });
      setCurrentLoginUsername("");
    } catch (error) {
      setLoginUsernameError(error.message);
    }
  };

  const handleThemeToggle = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("aquawatch_theme", newMode ? "dark" : "light");
  };

  const handleNotificationChange = (key) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const sections = [
    { id: "profile", label: "Profile", icon: User },
    { id: "security", label: "Security", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "appearance", label: "Appearance", icon: isDarkMode ? Moon : Sun },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[520px] p-0 overflow-hidden rounded-xl">
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-52 bg-gradient-to-b from-primary/10 to-background border-r border-border">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Settings2 className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-base font-semibold">Settings</DialogTitle>
                  <p className="text-xs text-muted-foreground">Customize your experience</p>
                </div>
              </div>
              
              <nav className="space-y-1">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={[
                        "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      ].join(" ")}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {section.label}
                    </button>
                  );
                })}
              </nav>
            </div>
            
            <div className="mt-auto p-4 border-t border-border">
              <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => onOpenChange(false)}>
                <X className="w-3.5 h-3.5 mr-1.5" />
                Close
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {activeSection === "profile" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Profile Information</h3>
                  <p className="text-xs text-muted-foreground">Update your company details</p>
                </div>

                {/* Profile Picture Upload */}
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden border-2 border-border shrink-0">
                    {profilePicture ? (
                      <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-muted-foreground" />
                    )}
                  </div>
                  <label className="w-24 h-24 rounded-full bg-muted hover:bg-muted/80 flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-border hover:border-primary/50 transition-colors shrink-0">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleProfilePictureUpload}
                    />
                    <span className="text-xs text-center text-muted-foreground px-2 leading-tight">Upload picture</span>
                  </label>
                </div>
                
                {profileSuccess && (
                  <Alert className="bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <AlertDescription>{profileSuccess}</AlertDescription>
                  </Alert>
                )}
                {profileError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{profileError}</AlertDescription>
                  </Alert>
                )}
                
                <form onSubmit={handleUpdateProfile} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="username">Company Name</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter company name"
                      className="max-w-sm h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email"
                      className="max-w-sm h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter phone number"
                      className="max-w-sm h-8 text-sm"
                    />
                  </div>
                  <Button type="submit" size="sm">Update Profile</Button>
                </form>
              </div>
            )}

            {activeSection === "security" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Security</h3>
                  <p className="text-xs text-muted-foreground">Manage your login credentials</p>
                </div>

                {/* Sub-tabs */}
                <div className="flex gap-2 border-b border-border">
                  <button
                    onClick={() => setSecuritySubTab("username")}
                    className={[
                      "px-4 py-2 text-sm font-medium transition-colors relative",
                      securitySubTab === "username"
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    ].join(" ")}
                  >
                    Login Username
                    {securitySubTab === "username" && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
                    )}
                  </button>
                  <button
                    onClick={() => setSecuritySubTab("password")}
                    className={[
                      "px-4 py-2 text-sm font-medium transition-colors relative",
                      securitySubTab === "password"
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    ].join(" ")}
                  >
                    Password
                    {securitySubTab === "password" && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
                    )}
                  </button>
                  <button
                    onClick={() => setSecuritySubTab("pin")}
                    className={[
                      "px-4 py-2 text-sm font-medium transition-colors relative",
                      securitySubTab === "pin"
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    ].join(" ")}
                  >
                    Security PIN
                    {securitySubTab === "pin" && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
                    )}
                  </button>
                </div>

                {/* Login Username Form */}
                {securitySubTab === "username" && (
                  <div className="space-y-3 p-4 rounded-lg border border-border bg-card">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-primary" />
                      <h4 className="font-semibold text-sm">Change Login Username</h4>
                    </div>
                    
                    {loginUsernameSuccess && (
                      <Alert className="bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <AlertDescription>{loginUsernameSuccess}</AlertDescription>
                      </Alert>
                    )}
                    {loginUsernameError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{loginUsernameError}</AlertDescription>
                      </Alert>
                    )}
                    
                    <form onSubmit={handleUpdateLoginUsername} className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="current-login-username">Current Login Username</Label>
                        <Input
                          id="current-login-username"
                          value={currentLoginUsername}
                          onChange={(e) => setCurrentLoginUsername(e.target.value)}
                          placeholder="Enter current login username"
                          className="max-w-sm h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-login-username">New Login Username</Label>
                        <Input
                          id="new-login-username"
                          value={loginUsername}
                          onChange={(e) => setLoginUsername(e.target.value)}
                          placeholder="Enter new login username"
                          className="max-w-sm h-9 text-sm"
                        />
                      </div>
                      <Button type="submit" size="sm">Update Login Username</Button>
                    </form>
                  </div>
                )}

                {/* Password Form */}
                {securitySubTab === "password" && (
                  <div className="space-y-3 p-4 rounded-lg border border-border bg-card">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-primary" />
                      <h4 className="font-semibold text-sm">Change Password</h4>
                    </div>
                    
                    {passwordSuccess && (
                      <Alert className="bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <AlertDescription>{passwordSuccess}</AlertDescription>
                      </Alert>
                    )}
                    {passwordError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{passwordError}</AlertDescription>
                      </Alert>
                    )}
                    
                    <form onSubmit={handleUpdatePassword} className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="current-password">Current Password</Label>
                        <div className="relative max-w-sm">
                          <Input
                            id="current-password"
                            type={showCurrentPassword ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter current password"
                            className="h-9 text-sm pr-9"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <div className="relative max-w-sm">
                          <Input
                            id="new-password"
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                            className="h-9 text-sm pr-9"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <div className="relative max-w-sm">
                          <Input
                            id="confirm-password"
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            className="h-9 text-sm pr-9"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <Button type="submit" size="sm">Update Password</Button>
                    </form>
                  </div>
                )}

                {/* PIN Form */}
                {securitySubTab === "pin" && (
                  <div className="space-y-3 p-4 rounded-lg border border-border bg-card">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-amber-500" />
                      <h4 className="font-semibold text-sm">Security PIN</h4>
                    </div>
                    
                    {pinSuccess && (
                      <Alert className="bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <AlertDescription>{pinSuccess}</AlertDescription>
                      </Alert>
                    )}
                    {pinError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{pinError}</AlertDescription>
                      </Alert>
                    )}
                    
                    <form onSubmit={handleUpdatePin} className="space-y-3">
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
                          className="tracking-widest max-w-sm h-9 text-sm"
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
                          className="tracking-widest max-w-sm h-9 text-sm"
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
                          className="tracking-widest max-w-sm h-9 text-sm"
                        />
                      </div>
                      <Button type="submit" size="sm">Update PIN</Button>
                    </form>
                  </div>
                )}
              </div>
            )}

            {activeSection === "notifications" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Notification Preferences</h3>
                  <p className="text-xs text-muted-foreground">Configure how you receive alerts</p>
                </div>

                <div className="space-y-3 p-3 rounded-lg border border-border bg-card">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-alerts" className="text-sm">Email Alerts</Label>
                      <p className="text-xs text-muted-foreground">Receive alerts via email</p>
                    </div>
                    <Switch
                      id="email-alerts"
                      checked={notifications.emailAlerts}
                      onCheckedChange={() => handleNotificationChange("emailAlerts")}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="push-alerts" className="text-sm">Push Notifications</Label>
                      <p className="text-xs text-muted-foreground">Receive browser push notifications</p>
                    </div>
                    <Switch
                      id="push-alerts"
                      checked={notifications.pushAlerts}
                      onCheckedChange={() => handleNotificationChange("pushAlerts")}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="critical-only" className="text-sm">Critical Alerts Only</Label>
                      <p className="text-xs text-muted-foreground">Only notify for critical severity alerts</p>
                    </div>
                    <Switch
                      id="critical-only"
                      checked={notifications.criticalOnly}
                      onCheckedChange={() => handleNotificationChange("criticalOnly")}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSection === "appearance" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Appearance</h3>
                  <p className="text-xs text-muted-foreground">Customize your theme</p>
                </div>

                <div className="space-y-3 p-3 rounded-lg border border-border bg-card">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="dark-mode" className="text-sm">
                        {isDarkMode ? "Dark Mode" : "Light Mode"}
                      </Label>
                      <p className="text-xs text-muted-foreground">
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
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Settings() {
  return null;
}
