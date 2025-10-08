import { Link } from "@tanstack/react-router";
import GithubIcon from "./icons/GithubIcon";

export default function Footer() {
  return (
    <>
      <footer className="bg-gray-100 dark:bg-gray-900 p-6 md:p-12 w-full">
        <div className="container max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 text-sm">
          {/* Legal Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg text-gray-800 dark:text-white">Legal</h3>
            <Link to="/terms" className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 block">
              Terms of Service
            </Link>
          </div>
          {/* Social Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg text-gray-800 dark:text-white">Social</h3>
            <a
              href="https://github.com/itxtoledo/launchpad-platform"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 flex items-center space-x-2"
            >
              <GithubIcon />
              <span>GitHub</span>
            </a>
          </div>
        </div>

        <div className="text-center mt-8 text-gray-500 dark:text-gray-400 text-xs">
          &copy; {new Date().getFullYear()} Launchpad Platform. All rights
          reserved.
        </div>
      </footer>
    </>
  );
}
