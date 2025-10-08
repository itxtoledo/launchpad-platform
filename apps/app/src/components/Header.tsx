import { Link } from "@tanstack/react-router";
import { ConnectButtonComponent } from "../components/ConnectButtonComponent";
import { MountainIcon } from "lucide-react";
import DarkModeToggle from "./DarkModeToggle";
import { usePresaleFactory } from "@/hooks";

export default function Header() {
  const { isOwner } = usePresaleFactory();

  return (
    <header className="sticky top-0 z-50 w-full bg-white dark:bg-gray-900 border-b dark:border-gray-800 shadow-md hidden md:flex">
      <div className="container mx-auto flex items-center justify-between h-16 px-4 md:px-8">
        {/* Logo - Hidden on small screens */}
        <Link
          to="/"
          className="hidden md:flex items-center gap-2"
          data-testid="logo-home-link"
        >
          <MountainIcon className="h-8 w-8 text-blue-600" />
          <span className="text-xl font-bold text-gray-800 dark:text-white">
            Launchpad
          </span>
        </Link>

        {/* Navigation for Medium and Larger Screens */}
        <nav className="hidden md:flex items-center gap-8">
          <Link
            to="/"
            className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-orange-800 dark:hover:text-orange-500 transition duration-150"
            data-testid="all-presales-link"
          >
            All Presales
          </Link>
          <Link
            to="/presale-creation"
            className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-orange-800 dark:hover:text-orange-500 transition duration-150"
            data-testid="presale-creation-link"
          >
            Presale Creation
          </Link>
          <Link
            to="/my-tokens"
            className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-orange-800 dark:hover:text-orange-500 transition duration-150"
            data-testid="my-tokens-link"
          >
            My Tokens
          </Link>
          {isOwner && (
            <Link
              to="/factory-owner"
              className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-orange-800 dark:hover:text-orange-500 transition duration-150"
              data-testid="factory-owner-link"
            >
              Factory Owner
            </Link>
          )}
        </nav>

        {/* Connect Button and Dark Mode Toggle */}
        <div className="flex items-center space-x-4">
          <div data-testid="connect-button-wrapper">
            <ConnectButtonComponent />
          </div>
          <div data-testid="dark-mode-toggle-wrapper">
            <DarkModeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
