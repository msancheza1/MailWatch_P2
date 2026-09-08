interface Props {
  title: string;
  value: string | number;
  color: string;
}

export default function StatCard({ title, value, color }: Props) {
  return (
    <div className={` ${color} rounded-2xl p-6 text-white shadow-lg`}>
      <h3 className="text-sm opacity-90">{title}</h3>

      <p className="mt-4 text-4xl font-bold">{value}</p>
    </div>
  );
}
