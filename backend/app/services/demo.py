from app.schemas.demo import DemoScenarioOut
from app.services.registry import registry


class DemoService:
    @staticmethod
    def scenarios() -> list[DemoScenarioOut]:
        return [DemoScenarioOut(**scenario) for scenario in registry.scenarios()]
