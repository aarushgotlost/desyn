
"use client"; // Made this a Client Component

import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, Palette, Shield, Bell, LogOut } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext"; // Imported useAuth

export default function SettingsPage() {
  const { logout, loading } = useAuth(); // Get logout function

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center md:text-left">
        <h1 className="text-3xl font-bold font-headline">Settings</h1>
        <p className="text-muted-foreground">Manage your account and application preferences.</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><User className="mr-2 h-5 w-5 text-primary" /> Account</CardTitle>
          <CardDescription>Update your profile information and account settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium mb-1">Profile Information</h3>
            <p className="text-sm text-muted-foreground mb-2">Control your public profile details.</p>
            <Button variant="outline" asChild>
              <Link href="/onboarding/profile-setup">Edit Profile</Link> {/* Changed link to actual profile edit page */}
            </Button>
          </div>
          <Separator />
          <div>
            <h3 className="font-medium mb-1">Change Password</h3>
            <p className="text-sm text-muted-foreground mb-2">Update your account password for better security.</p>
            <Button variant="outline" asChild>
                <Link href="/forgot-password">Change Password</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Palette className="mr-2 h-5 w-5 text-primary" /> Appearance</CardTitle>
          <CardDescription>Customize the look and feel of the application.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Theme</h3>
              <p className="text-sm text-muted-foreground">Switch between light and dark mode.</p>
            </div>
            <ThemeToggle /> {/* ThemeToggle moved here */}
          </div>
        </CardContent>
      </Card>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Bell className="mr-2 h-5 w-5 text-primary" /> Notifications</CardTitle>
          <CardDescription>Manage your notification preferences.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">Notification settings will be available soon.</p>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Shield className="mr-2 h-5 w-5 text-primary" /> Security & Privacy</CardTitle>
          <CardDescription>Manage your account security and privacy settings.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">Security and privacy settings will be available soon.</p>
        </CardContent>
      </Card>

      <div className="text-center pt-4">
        <Button variant="destructive" className="w-full max-w-xs" onClick={handleLogout} disabled={loading}>
          <LogOut className="mr-2 h-4 w-4" /> Log Out
        </Button>
      </div>
    </div>
  );
}
