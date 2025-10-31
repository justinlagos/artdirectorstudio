import { UserMenu } from "./UserMenu";

export const Header = () => {
  return (
    <header className="border-b border-border py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <UserMenu />
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-semibold mb-3">
            ArtDirector Studio
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Reconstruct. Refine. Reimagine.
          </p>
        </div>
      </div>
    </header>
  );
};
