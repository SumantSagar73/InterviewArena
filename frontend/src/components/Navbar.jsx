import { Link, useLocation } from "react-router";
import { FileTextIcon, LayoutDashboardIcon, SparklesIcon } from "lucide-react";
import { UserButton } from "@clerk/clerk-react";

function Navbar() {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-base-100/60 backdrop-blur-xl border-b border-primary/20 sticky top-0 z-50 shadow-2xl">
      <div className="max-w-7xl mx-auto p-4 flex items-center justify-between">
        {/* LOGO */}
        <Link
          to="/"
          className="group flex items-center gap-3 hover:scale-105 transition-all duration-300"
        >
          <div className="size-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-shadow">
            <SparklesIcon className="size-6 text-white" />
          </div>

          <div className="flex flex-col">
            <span className="font-black text-xl text-white font-mono tracking-tighter">
              Interview Arena
            </span>
            <span className="text-[10px] text-primary font-bold uppercase tracking-widest -mt-1 ml-0.5">
              Code Together
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-1">
          {/* DASHBORD PAGE LINK */}
          <Link
            to={"/dashboard"}
            className={`px-4 py-2.5 rounded-lg transition-all duration-200 
              ${isActive("/dashboard")
                ? "bg-primary text-primary-content"
                : "hover:bg-base-200 text-base-content/70 hover:text-base-content"
              }
              
              `}
          >
            <div className="flex items-center gap-x-2.5">
              <LayoutDashboardIcon className="size-4" />
              <span className="font-medium hidden sm:inline">Dashbord</span>
            </div>
          </Link>

          {/* RESUME ANALYZER PAGE LINK */}
          <Link
            to={"/resume-analyzer"}
            className={`px-4 py-2.5 rounded-lg transition-all duration-200 
              ${isActive("/resume-analyzer")
                ? "bg-primary text-primary-content"
                : "hover:bg-base-200 text-base-content/70 hover:text-base-content"
              }
              
              `}
          >
            <div className="flex items-center gap-x-2.5">
              <FileTextIcon className="size-4" />
              <span className="font-medium hidden sm:inline">Resume</span>
            </div>
          </Link>

          {/* AI INTERVIEW PAGE LINK */}
          <Link
            to={"/ai-interview"}
            className={`px-4 py-2.5 rounded-lg transition-all duration-200 
              ${isActive("/ai-interview")
                ? "bg-primary text-primary-content"
                : "hover:bg-base-200 text-base-content/70 hover:text-base-content"
              }
              
              `}
          >
            <div className="flex items-center gap-x-2.5">
              <SparklesIcon className="size-4" />
              <span className="font-medium hidden sm:inline">Mock Interview</span>
            </div>
          </Link>

          <div className="ml-4 mt-2">
            <UserButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
export default Navbar;
