import { Router } from 'express'
import { getPolicy, getPolicyAtVersion, getPolicyVersions, getPublicSettings } from '../controllers/policiesController.js'

const router = Router()

router.get('/settings', getPublicSettings)
router.get('/:slug', getPolicy)
router.get('/:slug/versions', getPolicyVersions)
router.get('/:slug/versions/:version', getPolicyAtVersion)

export default router
