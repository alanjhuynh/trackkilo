import { useEffect, useState } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

export const MAX_SET_COUNT = 100;

const Card = ({ lift, isNew = true }) => {
    const [editMode, setEditMode] = useState(false);
    const [setCount, setSetCount] = useState(0)

    const [liftForm, setLiftForm] = useState({
        userId: lift.userId,
        name: lift.name,
        set: lift.set,
        rep: lift.rep,
        weight: lift.weight,
        metric: lift.metric,
        note: lift.note,
        date: lift.date,
      })

      useEffect(() => {
        if (isNew)
            setEditMode(true);
      }, []);

    function toggleEditMode(){
        setEditMode(!editMode);
    }

    function handleSetChange(e){
        let target = e.target
        let value = target.value
        let name = target.name

        if (name == 'set'){
            if (value > 100)
                setSetCount(MAX_SET_COUNT);
            else
                setSetCount(value); 
        }
    }

    if (editMode) {
        return (
            <>
                <div className="card bg-dark">
                    <div className="card-body">
                        <div className = "flex-between-center my-2">
                            <input 
                                className="bg-dark w-50"
                                placeholder="Lift name"
                            ></input>
                            <a className="edit-icon " onClick={() => toggleEditMode()}>Save</a>
                        </div>
                        <div className="flex-between-center mb-2">
                            <div className="d-flex align-items-center">
                                <input 
                                    className="bg-dark w-25"
                                    type="number"
                                    name="set"
                                    placeholder="Set"
                                    onBlur={handleSetChange}
                                ></input>
                                <FontAwesomeIcon className="mx-2" icon="fa-solid fa-x" />
                                <input 
                                    className="bg-dark w-25"
                                    placeholder="Rep"
                                ></input>
                            </div>
                            <div>
                                <input 
                                    className="bg-dark"
                                    type="date"
                                ></input>
                            </div>
                        </div>
                        {Array.from({ length: setCount }).map((e, i) => (
                            <div key={i} className="row mb-1">
                                <div className="col-2 d-flex align-items-center">
                                    <div className="bg-dark-2 profile-pic rounded-circle flex-center">{i+1}</div>
                                </div>
                                <div className="col-5 d-flex align-items-center">
                                    <input 
                                        className="weight-input bg-dark h-75"
                                        type="number"
                                        placeholder="Weight"
                                    ></input>
                                    <select className="metric-input bg-dark text-muted h-75">
                                        <option>lb</option>
                                        <option>kg</option>
                                    </select>
                                </div>  
                                <div className="col-5 d-flex align-items-center">
                                     <input 
                                        className="bg-dark h-75"
                                        type="number"
                                        placeholder="Rep"
                                    ></input>
                                    <input 
                                        className="bg-dark h-75"
                                        type="number"
                                        placeholder="RPE"
                                    ></input>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </>
        )
    }
    else {
        return (
            <>
                <div className="card bg-dark">
                    <div className="card-body">
                        <div className="flex-between-center">
                            <h5 className="card-title">
                                {lift.name}
                            </h5>
                            <a className="edit-icon" onClick={() => toggleEditMode()}><FontAwesomeIcon icon="fa-regular fa-pen-to-square"/></a>
                        </div>
                        <h6 className="card-subtitle mb-2 text-muted">Card subtitle</h6>
                        <div className="bg-dark-2 profile-pic rounded-circle flex-center">{lift.set}</div>
                        <div>{lift.weight}</div>
                    </div>
                </div>
            </>
        )
    }
}

export default Card
