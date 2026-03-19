import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-vv-teal">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            cardBox: "shadow-none border border-border",
          },
        }}
      />
    </div>
  );
}
