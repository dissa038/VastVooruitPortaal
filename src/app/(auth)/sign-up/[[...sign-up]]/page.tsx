import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-vv-teal">
      <SignUp
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
