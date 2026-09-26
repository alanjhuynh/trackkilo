import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDumbbell, faPersonBiking, faPersonRunning, faPersonWalking,
} from '@fortawesome/free-solid-svg-icons';

export const KIND_ICONS = {
  lift: faDumbbell,
  run: faPersonRunning,
  walk: faPersonWalking,
  ride: faPersonBiking,
};

// Icon for a log entry's kind (lift, run, walk or ride)
export default function KindIcon({ kind, className }) {
  return <FontAwesomeIcon icon={KIND_ICONS[kind] || faDumbbell} className={className} fixedWidth />;
}
