import { FormEvent, useState } from "react";
import { Button } from "../common/Button";
import { useWorkshopStore } from "../../store/workshopStore";

export const NameEntryDialog = () => {
  const { participantProfile, saveParticipantName } = useWorkshopStore();
  const [name, setName] = useState("");

  if (participantProfile?.name) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      return;
    }

    saveParticipantName(name);
  };

  return (
    <div className="fixed inset-x-0 top-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 flex items-center justify-center bg-gray-950/50 px-4">
      <form
        className="w-full max-w-sm rounded-lg bg-white p-5 shadow-2xl"
        onSubmit={handleSubmit}
      >
        <p className="text-sm font-semibold text-brand-700">처음 오셨나요?</p>
        <h2 className="mt-1 text-xl font-bold">이름을 입력해 주세요</h2>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          입력한 이름은 이 기기 localStorage에 저장되고 이벤트 응답과 연결됩니다.
        </p>
        <input
          autoFocus
          className="mt-5 w-full rounded-lg border border-gray-300 px-4 py-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          onChange={(event) => setName(event.target.value)}
          placeholder="예: 홍길동"
          value={name}
        />
        <Button className="mt-4 w-full" disabled={!name.trim()} type="submit">
          확인
        </Button>
      </form>
    </div>
  );
};
