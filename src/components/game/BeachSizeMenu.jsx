import MenuCard from "./MenuCard.jsx";

export default function BeachSizeMenu({ onSelectSize }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
      <div className="flex w-full max-w-96 flex-col gap-3">
        <MenuCard
          icon="🏖️"
          label="2v2 Beach"
          subtitle="First to 21, win by 2"
          onClick={() => onSelectSize(null)}
        />
        <MenuCard
          icon="🏖️"
          label="3v3 Beach"
          subtitle="First to 21, win by 2"
          onClick={() => onSelectSize(3)}
        />
        <MenuCard
          icon="🏖️"
          label="4v4 Beach"
          subtitle="First to 21, win by 2"
          onClick={() => onSelectSize(4)}
        />
      </div>
    </div>
  );
}
