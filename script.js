// Ensure this script is loaded after the DOM and after SweetAlert2
document.addEventListener('DOMContentLoaded', () => {

    // --- EMISSION FACTORS (from data.js, included here for standalone use) ---
    const emissionFactors = {
        'IN': { name: "India", currency: '₹', distanceUnit: 'km', electricity_grid_intensity: 0.71, gas_kg_co2: 2.75, car_petrol_km: 0.19, car_diesel_km: 0.17, car_electric_km_base: 0.16, pt_bus_km: 0.10, pt_train_local_km: 0.05, flight_factor: 90, diet_factors: { heavy_meat: 10.2, medium_meat: 7.0, low_meat: 5.5, pescatarian: 5.1, vegetarian: 4.0, vegan: 3.2 }, secondary_factor: 0.025 },
        'US': { name: "United States", currency: '$', distanceUnit: 'miles', electricity_grid_intensity: 0.37, gas_kg_co2: 2.75, car_petrol_mi: 0.34, car_diesel_mi: 0.32, car_electric_mi_base: 0.29, pt_bus_mi: 0.18, pt_train_local_mi: 0.15, flight_factor: 90, diet_factors: { heavy_meat: 12.5, medium_meat: 8.5, low_meat: 6.9, pescatarian: 6.0, vegetarian: 4.8, vegan: 3.8 }, secondary_factor: 0.007 },
        'GB': { name: "United Kingdom", currency: '£', distanceUnit: 'miles', electricity_grid_intensity: 0.19, gas_kg_co2: 2.75, car_petrol_mi: 0.27, car_diesel_mi: 0.25, car_electric_mi_base: 0.28, pt_bus_mi: 0.16, pt_train_local_mi: 0.06, flight_factor: 90, diet_factors: { heavy_meat: 11.0, medium_meat: 7.5, low_meat: 6.0, pescatarian: 5.3, vegetarian: 4.2, vegan: 3.4 }, secondary_factor: 0.009 }
    };
    
    // --- STATE MANAGEMENT ---
    const state = {
        currentStep: 1,
        calculationPeriod: 'monthly',
        country: 'IN',
        sections: { household: true, transport: true, flights: false, lifestyle: true },
        visibleSteps: ['setup', 'calculation', 'results']
    };
    
    // --- DOM ELEMENT CACHE ---
    const ui = {
        stepper: document.getElementById('stepper'),
        stepContents: document.querySelectorAll('.step-content'),
        prevBtn: document.getElementById('prevBtn'),
        nextBtn: document.getElementById('nextBtn'),
        periodCards: document.querySelectorAll('.period-card'),
        categoryCards: document.querySelectorAll('.category-card'),
        countrySelect: document.getElementById('country'),
        saveBtn: document.getElementById('saveImpactBtn'),
        dashboardBtn: document.getElementById('dashboard-btn')
    };

    // --- FUNCTIONS ---

    function getInputValue(id) {
        return parseFloat(document.getElementById(id).value) || 0;
    }

    function updateStepper() {
        const steps = [{ id: 'setup', label: 'Setup' }];
        if (state.sections.household || state.sections.transport || state.sections.flights || state.sections.lifestyle) {
            steps.push({ id: 'calculation', label: 'Calculation' });
        }
        steps.push({ id: 'results', label: 'Results' });
        state.visibleSteps = steps.map(s => s.id);
        
        ui.stepper.innerHTML = steps.map((step, index) => {
            const stepNum = index + 1;
            const isActive = stepNum === state.currentStep;
            const isCompleted = stepNum < state.currentStep;
            return `<div class="step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}">
                        <div class="step-circle">${isCompleted ? '<i class="fas fa-check"></i>' : stepNum}</div>
                        <div class="step-label">${step.label}</div>
                    </div>`;
        }).join('<div class="step-line-container"><div class="step-line"></div></div>'); // simplified line
    }

    function showStep(stepIndex) {
        state.currentStep = stepIndex;
        const currentStepId = state.visibleSteps[stepIndex - 1];
        
        ui.stepContents.forEach(content => content.classList.remove('active'));
        document.querySelector(`.step-content[data-step-id="${currentStepId}"]`).classList.add('active');

        ui.prevBtn.disabled = stepIndex === 1;
        ui.nextBtn.disabled = stepIndex === state.visibleSteps.length;
        ui.nextBtn.innerHTML = (stepIndex === state.visibleSteps.length - 1) ? 'Calculate <i class="fas fa-calculator ms-2"></i>' : 'Next <i class="fas fa-arrow-right ms-2"></i>';
    }

    function updateLabelsAndUnits() {
        state.calculationPeriod = document.querySelector('.period-card.selected').dataset.period;
        state.country = ui.countrySelect.value;
        const factors = emissionFactors[state.country];
        const periodText = state.calculationPeriod.replace('ly', ''); // monthly -> month
        
        document.querySelectorAll('.period-text').forEach(el => el.textContent = `per ${periodText}`);
        document.querySelectorAll('.period-text-inline').forEach(el => el.textContent = `(${periodText})`);
        document.querySelectorAll('.distance-unit').forEach(el => el.textContent = factors.distanceUnit);
        document.querySelectorAll('.currency-unit').forEach(el => el.textContent = factors.currency);

        document.querySelectorAll('.calculation-section').forEach(section => {
             section.style.display = state.sections[section.dataset.section] ? 'block' : 'none';
        });
    }

    function calculateFootprint() {
        const period = state.calculationPeriod;
        const factors = emissionFactors[state.country];
        const householdSize = getInputValue('householdSize') || 1;
        
        const periodMultipliers = { daily: 1, weekly: 7, monthly: 30 };
        const multiplier = periodMultipliers[period];
        
        const results = {
            household: 0, transport: 0, flights: 0, lifestyle: 0, total: 0
        };

        // Household
        if (state.sections.household) {
            results.household += getInputValue('electricity') * factors.electricity_grid_intensity;
            results.household += getInputValue('gas') * factors.gas_kg_co2;
        }

        // Transport
        if (state.sections.transport) {
            const carFuel = document.getElementById('carFuel').value;
            let carFactor;
            if(carFuel === 'electric') {
                carFactor = factors.car_electric_km_base * factors.electricity_grid_intensity;
            } else {
                 carFactor = factors[`car_${carFuel}_${factors.distanceUnit === 'km' ? 'km' : 'mi'}`]
            }
            results.transport += getInputValue('carDistance') * carFactor;
            results.transport += getInputValue('busDistance') * factors[`pt_bus_${factors.distanceUnit === 'km' ? 'km' : 'mi'}`];
            results.transport += getInputValue('trainDistance') * factors[`pt_train_local_${factors.distanceUnit === 'km' ? 'km' : 'mi'}`];
        }

        // Flights (Factor is per hour, assuming avg short haul flight is ~2 hours)
        if (state.sections.flights) {
            results.flights += getInputValue('flights') * factors.flight_factor * 2; 
        }

        // Lifestyle (factors are daily)
        if (state.sections.lifestyle) {
            const dietType = document.getElementById('dietType').value;
            results.lifestyle += (factors.diet_factors[dietType] || 0) * multiplier;
            results.lifestyle += getInputValue('shopping') * factors.secondary_factor;
        }

        results.household = (results.household / householdSize); // Per person for the period
        
        // Summing up
        results.total = results.household + results.transport + results.flights + results.lifestyle;

        return results;
    }

    function displayResults(results) {
        document.getElementById('totalEmissions').textContent = results.total.toFixed(2);
        document.querySelector('.period-text').textContent = `per ${state.calculationPeriod.replace('ly','')}`;
        document.getElementById('resultHousehold').textContent = getInputValue('householdSize');

        const breakdownContainer = document.getElementById('breakdownList');
        breakdownContainer.innerHTML = '';
        
        const categoryData = {
            household: {label: 'Household', icon: 'fa-home'},
            transport: {label: 'Transport', icon: 'fa-car'},
            flights: {label: 'Flights', icon: 'fa-plane'},
            lifestyle: {label: 'Lifestyle', icon: 'fa-shopping-basket'},
        };
        
        // Generate breakdown list
        let sortedResults = Object.entries(results).filter(([key, value]) => key !== 'total' && value > 0).sort((a,b) => b[1] - a[1]);
        
        if(sortedResults.length === 0){
             breakdownContainer.innerHTML = `<p class="text-muted text-center p-3">No emissions calculated. Enter some data first.</p>`;
             document.getElementById('tipsList').innerHTML = `<p class="text-muted">No tips to show yet.</p>`;
             return;
        }
        
        sortedResults.forEach(([key, value]) => {
            const percentage = (value / results.total * 100).toFixed(0);
            const item = document.createElement('div');
            item.className = 'breakdown-item';
            item.innerHTML = `<span><i class="fas ${categoryData[key].icon} me-2"></i>${categoryData[key].label}</span>
                              <span><strong>${value.toFixed(2)} kg</strong> (${percentage}%)</span>`;
            breakdownContainer.appendChild(item);
        });

        // Generate top tip
        const topCategory = sortedResults[0][0];
        const tips = {
            household: 'Switch to LEDs and unplug devices to reduce your energy consumption.',
            transport: 'Try carpooling, using public transit, or cycling for shorter trips.',
            flights: 'Consider trains for shorter travel and fly direct to reduce flight emissions.',
            lifestyle: 'Adopting a more plant-rich diet is one of the biggest ways to reduce your footprint.'
        };
        
        const tipsContainer = document.getElementById('tipsList');
        tipsContainer.innerHTML = `<div class="tip-item">
                                        <i class="fas fa-leaf text-success fs-4"></i>
                                        <div><strong>Focus on ${topCategory}:</strong> ${tips[topCategory]}</div>
                                   </div>`;

    }
    
    // --- EVENT LISTENERS ---

    ui.periodCards.forEach(card => card.addEventListener('click', () => {
        ui.periodCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        updateLabelsAndUnits();
    }));

    ui.categoryCards.forEach(card => card.addEventListener('click', () => {
        const checkbox = card.querySelector('input[type="checkbox"]');
        checkbox.checked = !checkbox.checked;
        const category = card.dataset.category;
        state.sections[category] = checkbox.checked;
        card.classList.toggle('selected', checkbox.checked);
        updateStepper();
    }));

    ui.countrySelect.addEventListener('change', updateLabelsAndUnits);

    ui.prevBtn.addEventListener('click', () => showStep(state.currentStep - 1));
    ui.nextBtn.addEventListener('click', () => {
        if (state.currentStep === state.visibleSteps.length - 1) { // When "Calculate" is clicked
            const results = calculateFootprint();
            displayResults(results);
        }
        showStep(state.currentStep + 1);
    });

    ui.dashboardBtn.addEventListener('click', () => {
         window.location.href = 'dashboard.html';
    });
    
    ui.saveBtn.addEventListener('click', () => {
        const results = calculateFootprint();
        localStorage.setItem('greenwalk_pending_calculation', JSON.stringify({
             ...results, 
             period: state.calculationPeriod, 
             timestamp: new Date().toISOString()
        }));

        Swal.fire({
            title: 'Save Your Impact!',
            html: `<p>Your carbon footprint is <strong>${results.total.toFixed(2)} kg CO₂e</strong> ${document.querySelector('.period-text').textContent}.</p>
                   <p class="mt-3">Sign up or log in to track your progress and get AI-powered insights!</p>`,
            icon: 'success',
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-user-plus me-2"></i>Sign Up / Log In',
            confirmButtonColor: '#4a7c4e',
            cancelButtonText: 'Not Now'
        }).then((result) => {
            if (result.isConfirmed) {
                // In a real app, this would redirect to a login/signup page.
                // For Phase 1, we will simulate this with an alert.
                Swal.fire({
                   title: 'Coming Soon!',
                   text: 'The user dashboard will be available in Phase 2. Your result is saved in this browser for now.',
                   icon: 'info',
                   confirmButtonColor: '#4a7c4e',
                });
            }
        });
    });

    // --- INITIALIZATION ---
    function init() {
        updateStepper();
        showStep(1);
        updateLabelsAndUnits();
    }
    
    init();

}); 