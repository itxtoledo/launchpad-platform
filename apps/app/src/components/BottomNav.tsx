import { Link } from "@tanstack/react-router";
import { HomeIcon, PlusCircleIcon, ListOrderedIcon, WalletCardsIcon } from "lucide-react";

export default function BottomNav() {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t dark:border-gray-800 shadow-lg md:hidden z-50">
      <nav className="flex justify-around h-16 items-center">
        <Link to="/" className="flex flex-col items-center text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-orange-800 dark:hover:text-orange-500 transition duration-150" data-testid="mobile-home-link">
          <HomeIcon className="h-6 w-6" />
          Home
        </Link>
        <Link to="/presales" className="flex flex-col items-center text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-orange-800 dark:hover:text-orange-500 transition duration-150" data-testid="mobile-presales-link">
          <ListOrderedIcon className="h-6 w-6" />
          Presales
        </Link>
        <Link to="/presale-creation" className="flex flex-col items-center text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-orange-800 dark:hover:text-orange-500 transition duration-150" data-testid="mobile-create-link">
          <PlusCircleIcon className="h-6 w-6" />
          Create
        </Link>
        <Link to="/my-tokens" className="flex flex-col items-center text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-orange-800 dark:hover:text-orange-500 transition duration-150" data-testid="mobile-my-tokens-link">
          <WalletCardsIcon className="h-6 w-6" />
          My Tokens
        </Link>
      </nav>
    </div>
  );
}
