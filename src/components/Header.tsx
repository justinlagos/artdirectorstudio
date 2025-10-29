export const Header = () => {
  return (
    <header className="border-b border-border py-8">
      <div className="container mx-auto px-4 max-w-5xl text-center">
        <h1 className="text-4xl md:text-5xl font-semibold mb-3">
          Prompt Reconstructor
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Upload any image and generate a professional AI prompt to recreate it.
        </p>
      </div>
    </header>
  );
};
