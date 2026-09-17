export default function Footer() {
  return (
    <footer
      className="w-full border-t py-8"
      style={{ borderColor: "var(--gray-200)" }}
    >
      <div className="mx-auto max-w-2xl px-6 text-center">
        <p className="micro-label">&copy; {new Date().getFullYear()} mrn. all rights reserved.</p>
      </div>
    </footer>
  );
}