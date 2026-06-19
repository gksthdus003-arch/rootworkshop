import { FormEvent, useState } from "react";
import { Button } from "../common/Button";
import { useWorkshopStore } from "../../store/workshopStore";

const NETWORK_ERROR_MESSAGE =
  "확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";

export const NameEntryDialog = () => {
  const { participantProfile, saveParticipantName } = useWorkshopStore();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (participantProfile?.name) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = name.trim();
    if (!trimmed || submitting) {
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const result = await saveParticipantName(trimmed);
      if (!result.ok) {
        setError(result.error ?? NETWORK_ERROR_MESSAGE);
      }
    } catch (err) {
      console.error("[workshop] save participant failed", err);
      setError(NETWORK_ERROR_MESSAGE);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-x-0 top-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 flex items-center justify-center bg-gray-950/50 px-4">
      <form
        className="w-full max-w-sm rounded-lg bg-white p-5 shadow-2xl"
        onSubmit={handleSubmit}
      >
        <p className="text-sm font-semibold text-brand-700">환영합니다!</p>
        <h2 className="mt-1 text-xl font-bold">이름을 입력해 주세요.</h2>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          입력한 이름은 설문 응답과 연결됩니다.
        </p>
        <input
          autoFocus
          className="mt-5 w-full rounded-lg border border-gray-300 px-4 py-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          onChange={(event) => {
            setName(event.target.value);
            if (error) {
              setError("");
            }
          }}
          placeholder="ex) 한소연"
          value={name}
        />
        {error ? (
          <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
        ) : null}
        <Button
          className="mt-4 w-full"
          disabled={!name.trim() || submitting}
          type="submit"
        >
          확인
        </Button>
      </form>
    </div>
  );
};
