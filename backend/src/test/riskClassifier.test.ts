import { RiskClassifier } from '../services/riskClassifier.js';

describe(
    "Risk Classifier",
    ()=>{


        const classifier =
            new RiskClassifier();



        test(
            "Should classify malicious emails",
            ()=>{


                const result =
                    classifier.classify(90);



                expect(result)
                .toBe("Malicious");


            }
        );



        test(
            "Should classify suspicious emails",
            ()=>{


                const result =
                    classifier.classify(50);



                expect(result)
                .toBe("Suspicious");


            }
        );



        test(
            "Should classify safe emails",
            ()=>{


                const result =
                    classifier.classify(10);



                expect(result)
                .toBe("Safe");


            }
        );


    }
);