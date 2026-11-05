import { Link } from 'react-router-dom'
import { IconUsers } from '../components/Icons'
import { Card, Page } from '../components/Page'

/** Empty on purpose: PlacementIQ holds no alumni records, so this page must not show anyone until real ones exist. */
export default function AlumniNetwork() {
  return (
    <Page title="Alumni Network" subtitle="Alumni contacts are not available yet.">
      <Card>
        <div className="flex flex-col items-center px-4 py-10 text-center">
          <span aria-hidden className="grid h-11 w-11 place-items-center rounded-[12px] bg-[#faf8ff] text-brand-dark">
            <IconUsers className="h-5 w-5" />
          </span>
          <h2 className="mt-4 text-[15px] font-semibold text-ink">No alumni to show</h2>
          <p className="mt-1.5 max-w-[440px] text-[12.5px] leading-[1.65] text-ink-mute">
            PlacementIQ does not have a verified list of your college's alumni, so nobody is listed here. Your placement cell is the best route to an introduction.
          </p>
          <Link to="/help" className="btn-glass mt-4">Help & Support</Link>
        </div>
      </Card>
    </Page>
  )
}
