"use client";

type Stop = {
  id: string;
  city: string;
  state: string;
  date: string;
  time: string;
  location: string;
  active: boolean;
  brands: { name: string } | { name: string }[];
};

export default function StopTableBody({ stops }: { stops: Stop[] }) {
  return (
    <tbody className="divide-y divide-slate-200">
      {stops?.map((stop) => (
        <tr
          key={stop.id}
          onClick={() =>
            (window.location.href = `/admin/stops/${stop.id}`)
          }
          className="cursor-pointer hover:bg-zinc-800"
        >
          <td className="px-5 py-4">
            <span className="font-medium text-zinc-100">
              {stop.city}, {stop.state}
            </span>
          </td>

          <td className="px-5 py-4 text-zinc-300">
            {stop.location}
          </td>

          <td className="px-5 py-4 text-zinc-300">
            {stop.date}
          </td>

          <td className="px-5 py-4 text-zinc-300">
            {stop.time}
          </td>

          <td className="px-5 py-4 text-zinc-300">
            {Array.isArray(stop.brands)
              ? stop.brands[0]?.name
              : stop.brands?.name}
          </td>

          <td className="px-5 py-4">
            <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-medium text-zinc-300">
              {stop.active ? "Active" : "Inactive"}
            </span>
          </td>
        </tr>
      ))}
    </tbody>
  );
}