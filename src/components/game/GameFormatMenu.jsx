import MenuCard from "./MenuCard.jsx";

export default function GameFormatMenu({ onSelectFormat }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
      <div className="flex w-full max-w-96 flex-col gap-3">
        <MenuCard
          icon="🏖️"
          label="Beach"
          subtitle="First to 21, win by 2"
          onClick={() => onSelectFormat("beach")}
        />
        <MenuCard
          icon="🏐"
          label="6v6 Indoor"
          subtitle="First to 25, win by 2"
          onClick={() => onSelectFormat("indoor")}
        />
      </div>
    </div>
  );
}
